package com.dadkit.mobile.sync

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Test

class JsonDocumentMergerTest {
    @Test
    fun `keeps independent checklist changes and chooses newer entity`() {
        val local = document(
            checklist = JSONArray()
                .put(item("same", "本机旧名称", 10))
                .put(item("local", "本机新增", 20)),
        )
        val remote = document(
            checklist = JSONArray()
                .put(item("same", "家人新名称", 30))
                .put(item("remote", "家人新增", 25)),
        )

        val merged = JsonDocumentMerger.merge(local, remote)
        val items = merged.getJSONArray("checklist").objectsById()

        assertEquals(setOf("same", "local", "remote"), items.keys)
        assertEquals("家人新名称", items.getValue("same").getString("name"))
    }

    @Test
    fun `newer custom item tombstone removes stale item`() {
        val custom = item("custom", "待删除", 50).put("source", "user")
        val local = document(
            checklist = JSONArray().put(JSONObject(custom.toString())),
            customItems = JSONArray().put(JSONObject(custom.toString())),
        )
        val remote = document().put("deletedCustomItems", JSONObject().put("custom", 60))

        val merged = JsonDocumentMerger.merge(local, remote)

        assertEquals(0, merged.getJSONArray("checklist").length())
        assertEquals(0, merged.getJSONArray("customItems").length())
        assertEquals(60, merged.getJSONObject("deletedCustomItems").getLong("custom"))
    }

    @Test
    fun `merges hospital fields and baby event tombstones independently`() {
        val local = document()
        local.getJSONObject("hospital").getJSONObject("fields")
            .put("hospitalName", stamped("旧医院", 10))
            .put("address", stamped("本机地址", 40))
        local.getJSONObject("baby").getJSONObject("care").getJSONArray("events")
            .put(careEvent("care-one", 20, null))

        val remote = document()
        remote.getJSONObject("hospital").getJSONObject("fields")
            .put("hospitalName", stamped("新医院", 30))
            .put("address", stamped("家人旧地址", 15))
        remote.getJSONObject("baby").getJSONObject("care").getJSONArray("events")
            .put(careEvent("care-one", 50, 50))

        val merged = JsonDocumentMerger.merge(local, remote)
        val fields = merged.getJSONObject("hospital").getJSONObject("fields")
        val event = merged.getJSONObject("baby").getJSONObject("care")
            .getJSONArray("events").getJSONObject(0)

        assertEquals("新医院", fields.getJSONObject("hospitalName").getString("value"))
        assertEquals("本机地址", fields.getJSONObject("address").getString("value"))
        assertEquals(50, event.getLong("deletedAt"))
    }

    @Test
    fun `derives hidden checklist ids from newest stamps`() {
        val local = document().put(
            "hiddenTemplateItemStamps",
            JSONObject().put("one", JSONObject().put("hidden", true).put("updatedAt", 10)),
        )
        val remote = document().put(
            "hiddenTemplateItemStamps",
            JSONObject()
                .put("one", JSONObject().put("hidden", false).put("updatedAt", 20))
                .put("two", JSONObject().put("hidden", true).put("updatedAt", 30)),
        )

        val merged = JsonDocumentMerger.merge(local, remote)
        val ids = merged.getJSONArray("hiddenTemplateItemIds")

        assertEquals(1, ids.length())
        assertEquals("two", ids.getString(0))
        assertFalse(merged.getJSONObject("hiddenTemplateItemStamps").getJSONObject("one").getBoolean("hidden"))
        assertNotNull(merged.getJSONObject("hiddenTemplateItemStamps").getJSONObject("two"))
    }

    private fun document(
        checklist: JSONArray = JSONArray(),
        customItems: JSONArray = JSONArray(),
    ): JSONObject = JSONObject()
        .put("version", 9)
        .put("exportedAt", "2026-01-01T00:00:00Z")
        .put("checklistMode", "lean")
        .put("checklist", checklist)
        .put("customItems", customItems)
        .put("hiddenTemplateItemIds", JSONArray())
        .put("hiddenTemplateItemStamps", JSONObject())
        .put("deletedCustomItems", JSONObject())
        .put("growth", JSONObject().put("version", 1))
        .put("growthUpdatedAt", 0)
        .put("hospital", JSONObject().put("version", 1).put("fields", JSONObject()))
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

    private fun item(id: String, name: String, updatedAt: Long) = JSONObject()
        .put("id", id)
        .put("name", name)
        .put("source", "general")
        .put("updatedAt", updatedAt)

    private fun careEvent(id: String, updatedAt: Long, deletedAt: Long?) = JSONObject()
        .put("id", id)
        .put("type", "diaper")
        .put("kind", "wet")
        .put("note", "")
        .put("createdAt", 10)
        .put("updatedAt", updatedAt)
        .put("deletedAt", deletedAt ?: JSONObject.NULL)
        .put("recordedByMemberId", JSONObject.NULL)
        .put("occurredAt", "2026-01-01T00:00:00Z")

    private fun stamped(value: Any, updatedAt: Long) =
        JSONObject().put("value", value).put("updatedAt", updatedAt)

    private fun JSONArray.objectsById(): Map<String, JSONObject> =
        (0 until length()).associate { index ->
            getJSONObject(index).let { it.getString("id") to it }
        }
}
