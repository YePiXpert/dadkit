package com.dadkit.mobile.data

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

class DadKitRepositoryTest {
    @Test
    fun `baby profile only refreshes the changed field timestamp`() {
        val document = document()
        val fields = document.getJSONObject("baby").getJSONObject("profile").getJSONObject("fields")
        fields.put("nickname", stamped("小满", 10))
        fields.put("birthDate", stamped("2026-08-01", 20))
        fields.put("birthTime", stamped("08:30", 30))
        fields.put("sex", stamped("girl", 40))
        val repository = DadKitRepository(document, clock = { 1_000 })

        val result = repository.saveBabyProfile(BabyProfile("安安", "2026-08-01", "08:30", "girl"))
        val saved = repository.currentDocument().getJSONObject("baby")
            .getJSONObject("profile").getJSONObject("fields")

        assertTrue(result.changed)
        assertEquals(1_001, saved.getJSONObject("nickname").getLong("updatedAt"))
        assertEquals(20, saved.getJSONObject("birthDate").getLong("updatedAt"))
        assertEquals(30, saved.getJSONObject("birthTime").getLong("updatedAt"))
        assertEquals(40, saved.getJSONObject("sex").getLong("updatedAt"))
        assertFalse(repository.saveBabyProfile(BabyProfile("安安", "2026-08-01", "08:30", "girl")).changed)
    }

    @Test
    fun `hospital profile only refreshes the changed field timestamp`() {
        val document = document()
        val fields = document.getJSONObject("hospital").getJSONObject("fields")
        fields.put("hospitalName", stamped("第一医院", 10))
        fields.put("generalNote", stamped("带上资料", 70))
        val repository = DadKitRepository(document, clock = { 2_000 })

        val result = repository.saveHospital(HospitalProfile(hospitalName = "新医院", generalNote = "带上资料"))
        val saved = repository.currentDocument().getJSONObject("hospital").getJSONObject("fields")

        assertTrue(result.changed)
        assertEquals(2_001, saved.getJSONObject("hospitalName").getLong("updatedAt"))
        assertEquals(70, saved.getJSONObject("generalNote").getLong("updatedAt"))
    }

    @Test
    fun `checklist edit preserves unchanged values in checklist and custom mirror`() {
        val document = document()
        val item = checklistItem("custom-one", 50)
        document.getJSONArray("checklist").put(JSONObject(item.toString()))
        document.getJSONArray("customItems").put(JSONObject(item.toString()))
        val repository = DadKitRepository(document, clock = { 3_000 })

        val result = repository.updateChecklistItem(
            id = "custom-one",
            name = "新名称",
            category = "mom_labor",
            quantity = "1 个",
            note = "原备注",
        )

        assertTrue(result.changed)
        for (arrayName in listOf("checklist", "customItems")) {
            val saved = repository.currentDocument().getJSONArray(arrayName).getJSONObject(0)
            assertEquals("新名称", saved.getString("name"))
            assertEquals("mom_labor", saved.getString("category"))
            assertEquals("1 个", saved.getString("quantity"))
            assertEquals("原备注", saved.getString("note"))
            assertEquals(3_001, saved.getLong("updatedAt"))
        }
        assertFalse(repository.updateChecklistItem("custom-one", "新名称", "mom_labor", "1 个", "原备注").changed)
    }

    @Test
    fun `new timestamps and care occurrence use the stored server offset`() {
        val repository = DadKitRepository(document(), clock = { 1_000 }, serverClockOffsetMs = 3_600_000)

        repository.saveBabyProfile(BabyProfile(nickname = "按服务器时间"))
        repository.addDiaperRecord("wet")
        val saved = repository.currentDocument()
        val nickname = saved.getJSONObject("baby").getJSONObject("profile")
            .getJSONObject("fields").getJSONObject("nickname")
        val event = saved.getJSONObject("baby").getJSONObject("care")
            .getJSONArray("events").getJSONObject(0)

        assertEquals(3_601_001, nickname.getLong("updatedAt"))
        assertEquals(Instant.ofEpochMilli(3_601_000).toString(), event.getString("occurredAt"))
    }

    @Test
    fun `status changes update the custom mirror`() {
        val document = document()
        val item = checklistItem("custom-one", 50).put("preparationKind", "wash_then_pack")
        document.getJSONArray("checklist").put(JSONObject(item.toString()))
        document.getJSONArray("customItems").put(JSONObject(item.toString()))
        val repository = DadKitRepository(document, clock = { 4_000 })

        assertTrue(repository.setChecklistItemStatus("custom-one", "washed").changed)
        assertEquals("washed", repository.currentDocument().getJSONArray("checklist").getJSONObject(0).getString("status"))
        assertEquals("washed", repository.currentDocument().getJSONArray("customItems").getJSONObject(0).getString("status"))
        assertFalse(repository.setChecklistItemStatus("custom-one", "washed").changed)
    }

    @Test
    fun `care records use the selected active family member and clear removed selection`() {
        val document = document()
        document.getJSONObject("household").getJSONObject("members").put(
            "member-one",
            JSONObject()
                .put("id", "member-one")
                .put("createdAt", 10)
                .put("displayName", stamped("妈妈", 10))
                .put("relationshipLabel", stamped("妈妈", 10))
                .put("deleted", stamped(false, 10)),
        )
        val repository = DadKitRepository(document, clock = { 5_000 })

        assertTrue(repository.setRecordedByMemberId("member-one").ok)
        repository.addDiaperRecord("wet")
        var events = repository.currentDocument().getJSONObject("baby").getJSONObject("care").getJSONArray("events")
        assertEquals("member-one", events.getJSONObject(0).getString("recordedByMemberId"))

        repository.removeFamilyMember("member-one")
        assertEquals("", repository.snapshot.value.recordedByMemberId)
        repository.addDiaperRecord("dirty")
        events = repository.currentDocument().getJSONObject("baby").getJSONObject("care").getJSONArray("events")
        assertTrue(events.getJSONObject(1).isNull("recordedByMemberId"))
    }

    private fun document(): JSONObject {
        val hospitalFields = JSONObject()
        for (key in listOf(
            "hospitalName", "campusName", "maternityPhone", "emergencyPhone", "address",
            "laborEntranceNote", "inpatientEntranceNote", "parkingNote", "admissionProcessNote",
            "companionRuleNote", "providedItemsNote", "restrictedItemsNote", "requiredDocumentsNote", "generalNote",
        )) {
            hospitalFields.put(key, stamped("", 0))
        }
        return JSONObject()
            .put("version", 9)
            .put("exportedAt", "2026-01-01T00:00:00Z")
            .put("checklistMode", "lean")
            .put("checklist", JSONArray())
            .put("customItems", JSONArray())
            .put("hiddenTemplateItemIds", JSONArray())
            .put("hiddenTemplateItemStamps", JSONObject())
            .put("deletedCustomItems", JSONObject())
            .put("growth", JSONObject().put("version", 1))
            .put("growthUpdatedAt", 0)
            .put("hospital", JSONObject().put("version", 1).put("fields", hospitalFields))
            .put("planning", JSONObject().put("version", 2).put("clearedAt", 0).put("items", JSONObject()))
            .put("baby", JSONObject()
                .put("version", 2)
                .put("profile", JSONObject()
                    .put("version", 1)
                    .put("clearedAt", 0)
                    .put("fields", JSONObject()
                        .put("nickname", stamped("", 0))
                        .put("birthDate", stamped("", 0))
                        .put("birthTime", stamped("", 0))
                        .put("sex", stamped("unspecified", 0))))
                .put("care", JSONObject().put("version", 2).put("clearedAt", 0).put("events", JSONArray())))
            .put("household", JSONObject()
                .put("version", 1)
                .put("clearedAt", 0)
                .put("householdName", stamped("", 0))
                .put("members", JSONObject()))
    }

    private fun checklistItem(id: String, updatedAt: Long) = JSONObject()
        .put("id", id)
        .put("name", "原名称")
        .put("category", "mom_labor")
        .put("quantity", "1 个")
        .put("note", "原备注")
        .put("status", "todo")
        .put("source", "user")
        .put("preparationKind", "pack_existing")
        .put("updatedAt", updatedAt)

    private fun stamped(value: Any, updatedAt: Long) =
        JSONObject().put("value", value).put("updatedAt", updatedAt)
}
