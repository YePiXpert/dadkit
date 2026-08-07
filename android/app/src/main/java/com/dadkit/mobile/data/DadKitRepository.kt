package com.dadkit.mobile.data

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.util.UUID
import kotlin.math.max

class DadKitRepository private constructor(
    private val preferences: SharedPreferences?,
    private val defaultChecklistLoader: () -> JSONArray,
    private val clock: () -> Long,
    private val clockOffsetMs: () -> Long,
    initialDocument: JSONObject?,
) {
    constructor(
        context: Context,
        clock: () -> Long = System::currentTimeMillis,
    ) : this(
        preferences = context.applicationContext.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE),
        defaultChecklistLoader = {
            context.applicationContext.assets.open("default_checklist.json")
                .bufferedReader().use { JSONArray(it.readText()) }
        },
        clock = clock,
        clockOffsetMs = {
            context.applicationContext.getSharedPreferences(SYNC_PREFERENCES_NAME, Context.MODE_PRIVATE)
                .getLong(SERVER_CLOCK_OFFSET_KEY, 0)
        },
        initialDocument = null,
    )

    internal constructor(
        initialDocument: JSONObject,
        clock: () -> Long = System::currentTimeMillis,
        serverClockOffsetMs: Long = 0,
    ) : this(
        preferences = null,
        defaultChecklistLoader = { JSONArray() },
        clock = clock,
        clockOffsetMs = { serverClockOffsetMs },
        initialDocument = initialDocument,
    )

    private var document = initialDocument?.let { JSONObject(it.toString()) } ?: loadDocument()
    private var revision = 1L
    private var recordedByMemberId = preferences?.getString(RECORDED_BY_MEMBER_ID_KEY, "").orEmpty()
    private val mutableSnapshot = MutableStateFlow(decode(document, revision))

    val snapshot: StateFlow<AppSnapshot> = mutableSnapshot.asStateFlow()

    @Synchronized
    fun toggleChecklistItem(id: String): DataActionResult = mutate { root, timestamp ->
        val item = root.array("checklist").objectWithId(id) ?: return@mutate false
        val next = when (item.optString("status", "todo")) {
            "todo" -> "bought"
            "bought", "washed", "last_minute" -> "packed"
            else -> "todo"
        }
        item.put("status", next).put("updatedAt", timestamp)
        root.array("customItems").objectWithId(id)?.apply {
            put("status", next)
            put("updatedAt", timestamp)
        }
        true
    }

    @Synchronized
    fun updateChecklistItem(
        id: String,
        name: String,
        category: String,
        quantity: String,
        note: String,
    ): DataActionResult {
        val cleanName = name.trim()
        if (cleanName.isEmpty()) return DataActionResult.failure("请填写物品名称。")
        return mutate { root, timestamp ->
            val item = root.array("checklist").objectWithId(id) ?: return@mutate false
            val values = linkedMapOf(
                "name" to cleanName.take(80),
                "category" to (category.takeIf(categoryLabels::containsKey) ?: item.optString("category", "mom_labor")),
                "quantity" to quantity.trim().take(40),
                "note" to note.trim().take(500),
            )
            val changedKeys = values.filter { (key, value) -> item.optString(key) != value }
            if (changedKeys.isEmpty()) return@mutate false
            changedKeys.forEach { (key, value) -> item.put(key, value) }
            item.put("updatedAt", timestamp)
            root.array("customItems").objectWithId(id)?.let { custom ->
                changedKeys.forEach { (key, value) -> custom.put(key, value) }
                custom.put("updatedAt", timestamp)
            }
            true
        }
    }

    @Synchronized
    fun addChecklistItem(
        name: String,
        category: String,
        quantity: String = "",
        note: String = "",
        preparationKind: String = "pack_existing",
    ): DataActionResult {
        val cleanName = name.trim()
        if (cleanName.isEmpty()) return DataActionResult.failure("请填写物品名称。")
        return mutate { root, timestamp ->
            val id = "native-${UUID.randomUUID()}"
            val cleanCategory = category.takeIf(categoryLabels::containsKey) ?: "mom_labor"
            val cleanPreparation = preparationKind.takeIf(customPreparationOptions::containsKey) ?: "pack_existing"
            val item = JSONObject()
                .put("id", id)
                .put("name", cleanName.take(80))
                .put("category", cleanCategory)
                .put("priority", "must")
                .put("quantity", quantity.trim().take(40))
                .put("note", note.trim().take(500))
                .put("status", "todo")
                .put("source", "user")
                .put("sourceLabel", "自定义")
                .put("editable", true)
                .put("removable", true)
                .put("packTier", "core")
                .put("itemKind", "item")
                .put("preparationKind", cleanPreparation)
                .put("bag", defaultBag(cleanCategory))
                .put("bulk", "small")
                .put("timing", if (cleanPreparation == "wash_then_pack") "wash_before_pack" else "pack_now")
                .put("updatedAt", timestamp)
            root.array("checklist").put(item)
            root.array("customItems").put(JSONObject(item.toString()))
            true
        }
    }

    @Synchronized
    fun removeChecklistItem(id: String): DataActionResult = mutate { root, timestamp ->
        val checklist = root.array("checklist")
        val item = checklist.objectWithId(id) ?: return@mutate false
        root.put("checklist", checklist.withoutId(id))
        if (item.optString("source") == "user") {
            root.put("customItems", root.array("customItems").withoutId(id))
            root.objectValue("deletedCustomItems").put(id, timestamp)
        } else {
            val hidden = root.array("hiddenTemplateItemIds")
            if (!hidden.stringValues().contains(id)) hidden.put(id)
            root.objectValue("hiddenTemplateItemStamps")
                .put(id, JSONObject().put("hidden", true).put("updatedAt", timestamp))
        }
        true
    }

    @Synchronized
    fun saveBabyProfile(profile: BabyProfile): DataActionResult = mutate { root, timestamp ->
        val fields = root.objectValue("baby").objectValue("profile").objectValue("fields")
        val values = mapOf(
            "nickname" to profile.nickname.trim().take(40),
            "birthDate" to profile.birthDate.trim().take(10),
            "birthTime" to profile.birthTime.trim().take(5),
            "sex" to (profile.sex.takeIf { it in BABY_SEX_VALUES } ?: "unspecified"),
        )
        values.count { (key, value) -> updateStampedField(fields, key, value, timestamp) } > 0
    }

    @Synchronized
    fun addBottleRecord(amountMl: Int, formula: Boolean, note: String = ""): DataActionResult {
        if (amountMl !in 1..2000) return DataActionResult.failure("请输入正确的奶量。")
        return mutate { root, timestamp ->
            root.objectValue("baby").objectValue("care").array("events").put(
                JSONObject()
                    .put("id", "care-${UUID.randomUUID()}")
                    .put("type", "bottle")
                    .put("note", note.trim().take(1000))
                    .put("createdAt", timestamp)
                    .put("updatedAt", timestamp)
                    .put("deletedAt", JSONObject.NULL)
                    .put("recordedByMemberId", recorderValue(root))
                    .put("occurredAt", currentInstant())
                    .put("milkType", if (formula) "formula" else "breastmilk")
                    .put("amountMl", amountMl),
            )
            true
        }
    }

    @Synchronized
    fun addDiaperRecord(kind: String, note: String = ""): DataActionResult = mutate { root, timestamp ->
        root.objectValue("baby").objectValue("care").array("events").put(
            JSONObject()
                .put("id", "care-${UUID.randomUUID()}")
                .put("type", "diaper")
                .put("note", note.trim().take(1000))
                .put("createdAt", timestamp)
                .put("updatedAt", timestamp)
                .put("deletedAt", JSONObject.NULL)
                .put("recordedByMemberId", recorderValue(root))
                .put("occurredAt", currentInstant())
                .put("kind", kind.takeIf { it in DIAPER_VALUES } ?: "wet"),
        )
        true
    }

    @Synchronized
    fun removeCareRecord(id: String): DataActionResult = mutate { root, timestamp ->
        val event = root.objectValue("baby").objectValue("care").array("events").objectWithId(id)
            ?: return@mutate false
        event.put("deletedAt", timestamp).put("updatedAt", timestamp)
        true
    }

    @Synchronized
    fun saveHospital(profile: HospitalProfile): DataActionResult = mutate { root, timestamp ->
        val fields = root.objectValue("hospital").objectValue("fields")
        val values = mapOf(
            "hospitalName" to profile.hospitalName,
            "campusName" to profile.campusName,
            "maternityPhone" to profile.maternityPhone,
            "emergencyPhone" to profile.emergencyPhone,
            "address" to profile.address,
            "laborEntranceNote" to profile.laborEntranceNote,
            "inpatientEntranceNote" to profile.inpatientEntranceNote,
            "parkingNote" to profile.parkingNote,
            "admissionProcessNote" to profile.admissionProcessNote,
            "companionRuleNote" to profile.companionRuleNote,
            "providedItemsNote" to profile.providedItemsNote,
            "restrictedItemsNote" to profile.restrictedItemsNote,
            "requiredDocumentsNote" to profile.requiredDocumentsNote,
            "generalNote" to profile.generalNote,
        )
        values.count { (key, value) ->
            updateStampedField(fields, key, value.trim().take(500), timestamp)
        } > 0
    }

    @Synchronized
    fun setChecklistItemStatus(id: String, status: String): DataActionResult = mutate { root, timestamp ->
        val item = root.array("checklist").objectWithId(id) ?: return@mutate false
        val allowed = statusOptionsFor(item.optString("preparationKind", "pack_existing"))
        val nextStatus = status.takeIf(allowed::contains)
            ?: return@mutate false
        if (item.optString("status", "todo") == nextStatus) return@mutate false
        item.put("status", nextStatus).put("updatedAt", timestamp)
        root.array("customItems").objectWithId(id)?.apply {
            put("status", nextStatus)
            put("updatedAt", timestamp)
        }
        true
    }

    @Synchronized
    fun setRecordedByMemberId(memberId: String?): DataActionResult {
        val cleanId = memberId.orEmpty().trim()
        if (cleanId.isNotEmpty() && cleanId !in activeMemberIds(document)) {
            return DataActionResult.failure("请选择仍在家庭中的成员。")
        }
        if (recordedByMemberId == cleanId) return DataActionResult.success(changed = false)
        val saved = preferences?.edit()?.let { editor ->
            if (cleanId.isEmpty()) editor.remove(RECORDED_BY_MEMBER_ID_KEY)
            else editor.putString(RECORDED_BY_MEMBER_ID_KEY, cleanId)
            editor.commit()
        } ?: true
        if (!saved) return DataActionResult.failure("无法保存这台设备的记录人设置。")
        recordedByMemberId = cleanId
        revision += 1
        mutableSnapshot.value = decode(document, revision)
        return DataActionResult.success()
    }

    @Synchronized
    fun setFamilyName(name: String): DataActionResult = mutate { root, timestamp ->
        root.objectValue("household").put("householdName", stamped(name.trim().take(40), timestamp))
        true
    }

    @Synchronized
    fun addFamilyMember(displayName: String, relationship: String): DataActionResult {
        if (displayName.isBlank()) return DataActionResult.failure("请填写成员称呼。")
        return mutate { root, timestamp ->
            val id = "member-${UUID.randomUUID()}"
            root.objectValue("household").objectValue("members").put(
                id,
                JSONObject()
                    .put("id", id)
                    .put("createdAt", timestamp)
                    .put("displayName", stamped(displayName.trim().take(40), timestamp))
                    .put("relationshipLabel", stamped(relationship.trim().take(30), timestamp))
                    .put("deleted", stamped(false, timestamp)),
            )
            true
        }
    }

    @Synchronized
    fun removeFamilyMember(id: String): DataActionResult = mutate { root, timestamp ->
        val member = root.objectValue("household").objectValue("members").optJSONObject(id)
            ?: return@mutate false
        member.put("deleted", stamped(true, timestamp))
        true
    }

    @Synchronized
    fun exportFamilyData(): String = document.toString(2)

    @Synchronized
    fun currentDocument(): JSONObject = JSONObject(document.toString())

    @Synchronized
    fun replaceFamilyData(raw: String): DataActionResult {
        val incoming = runCatching { JSONObject(raw) }.getOrNull()
            ?: return DataActionResult.failure("无法读取这个备份文件。")
        if (!isSupportedDocument(incoming)) {
            return DataActionResult.failure("这个文件不是可用的 DadKit 备份。")
        }
        return persistDocument(incoming, "恢复失败，请检查设备存储空间后重试。")
    }

    @Synchronized
    fun mergeRemoteDocument(
        incoming: JSONObject,
        merger: (JSONObject, JSONObject) -> JSONObject,
    ): Pair<DataActionResult, JSONObject?> {
        if (!isSupportedDocument(incoming)) {
            return DataActionResult.failure("收到的家庭数据无法读取。") to null
        }
        val merged = runCatching { merger(JSONObject(document.toString()), incoming) }
            .getOrElse {
                return DataActionResult.failure("家庭数据合并失败，请稍后重试。") to null
            }
        val result = persistDocument(merged, "同步结果无法保存，请检查设备存储空间。")
        return result to if (result.ok) JSONObject(merged.toString()) else null
    }

    private fun mutate(block: (JSONObject, Long) -> Boolean): DataActionResult {
        val next = JSONObject(document.toString())
        val changed = block(next, nextTimestamp(next))
        if (!changed) return DataActionResult.success(changed = false)
        next.put("exportedAt", currentInstant())
        return persistDocument(next, "保存失败，请检查设备存储空间后重试。")
    }

    private fun persistDocument(next: JSONObject, failureMessage: String): DataActionResult {
        val saved = preferences?.edit()?.putString(DOCUMENT_KEY, next.toString())?.commit() ?: true
        if (!saved) return DataActionResult.failure(failureMessage)
        document = JSONObject(next.toString())
        revision += 1
        mutableSnapshot.value = decode(document, revision)
        return DataActionResult.success()
    }

    private fun loadDocument(): JSONObject {
        val stored = preferences?.getString(DOCUMENT_KEY, null)
        if (stored != null) {
            runCatching { JSONObject(stored) }.getOrNull()?.takeIf(::isSupportedDocument)?.let { return it }
        }
        return defaultDocument()
    }

    private fun isSupportedDocument(value: JSONObject): Boolean =
        value.optInt("version") == INTERNAL_DOCUMENT_VERSION &&
            value.optJSONArray("checklist") != null &&
            value.optJSONObject("baby") != null &&
            value.optJSONObject("hospital") != null &&
            value.optJSONObject("household") != null

    private fun defaultDocument(): JSONObject {
        val checklist = defaultChecklistLoader()
        return JSONObject()
            .put("version", INTERNAL_DOCUMENT_VERSION)
            .put("exportedAt", currentInstant())
            .put("checklistMode", "lean")
            .put("checklist", checklist)
            .put("customItems", JSONArray())
            .put("hiddenTemplateItemIds", JSONArray())
            .put("growth", JSONObject()
                .put("version", 1)
                .put("profile", JSONObject().put("nickname", "").put("dueDate", ""))
                .put("progress", JSONObject().put("completedTaskIds", JSONArray())))
            .put("hiddenTemplateItemStamps", JSONObject())
            .put("deletedCustomItems", JSONObject())
            .put("growthUpdatedAt", 0)
            .put("hospital", defaultHospital())
            .put("planning", JSONObject().put("version", 2).put("clearedAt", 0).put("items", JSONObject()))
            .put("baby", defaultBaby())
            .put("household", JSONObject()
                .put("version", 1)
                .put("clearedAt", 0)
                .put("householdName", stamped("", 0))
                .put("members", JSONObject()))
    }

    private fun defaultHospital(): JSONObject {
        val fields = JSONObject()
        HOSPITAL_FIELDS.forEach { fields.put(it, stamped("", 0)) }
        return JSONObject().put("version", 1).put("fields", fields)
    }

    private fun defaultBaby(): JSONObject {
        val fields = JSONObject()
            .put("nickname", stamped("", 0))
            .put("birthDate", stamped("", 0))
            .put("birthTime", stamped("", 0))
            .put("sex", stamped("unspecified", 0))
        return JSONObject()
            .put("version", 2)
            .put("profile", JSONObject().put("version", 1).put("clearedAt", 0).put("fields", fields))
            .put("care", JSONObject().put("version", 2).put("clearedAt", 0).put("events", JSONArray()))
    }

    private fun decode(root: JSONObject, revision: Long): AppSnapshot {
        val hidden = root.array("hiddenTemplateItemIds").stringValues().toSet()
        val checklist = root.array("checklist").objects()
            .filterNot { hidden.contains(it.optString("id")) }
            .map { item ->
                val category = item.optString("category", "mom_labor")
                ChecklistEntry(
                    id = item.optString("id"),
                    name = item.optString("name", "未命名物品"),
                    category = category,
                    categoryLabel = categoryLabels[category] ?: "其他",
                    quantity = item.optString("quantity"),
                    note = item.optString("note"),
                    status = item.optString("status", "todo"),
                    source = item.optString("source", "user"),
                    preparationKind = item.optString("preparationKind", "pack_existing"),
                )
            }

        val baby = root.objectValue("baby")
        val babyFields = baby.objectValue("profile").objectValue("fields")
        val babyProfile = BabyProfile(
            nickname = babyFields.stampedString("nickname"),
            birthDate = babyFields.stampedString("birthDate"),
            birthTime = babyFields.stampedString("birthTime"),
            sex = babyFields.stampedString("sex").ifBlank { "unspecified" },
        )
        val careClearedAt = baby.objectValue("care").optLong("clearedAt", 0)
        val care = baby.objectValue("care").array("events").objects()
            .filter { it.isNull("deletedAt") && it.optLong("updatedAt") > careClearedAt }
            .sortedByDescending { it.optLong("updatedAt") }
            .take(100)
            .map(::decodeCare)

        val hospitalFields = root.objectValue("hospital").objectValue("fields")
        val hospital = HospitalProfile(
            hospitalName = hospitalFields.stampedString("hospitalName"),
            campusName = hospitalFields.stampedString("campusName"),
            maternityPhone = hospitalFields.stampedString("maternityPhone"),
            emergencyPhone = hospitalFields.stampedString("emergencyPhone"),
            address = hospitalFields.stampedString("address"),
            laborEntranceNote = hospitalFields.stampedString("laborEntranceNote"),
            inpatientEntranceNote = hospitalFields.stampedString("inpatientEntranceNote"),
            parkingNote = hospitalFields.stampedString("parkingNote"),
            admissionProcessNote = hospitalFields.stampedString("admissionProcessNote"),
            companionRuleNote = hospitalFields.stampedString("companionRuleNote"),
            providedItemsNote = hospitalFields.stampedString("providedItemsNote"),
            restrictedItemsNote = hospitalFields.stampedString("restrictedItemsNote"),
            requiredDocumentsNote = hospitalFields.stampedString("requiredDocumentsNote"),
            generalNote = hospitalFields.stampedString("generalNote"),
        )

        val household = root.objectValue("household")
        val clearedAt = household.optLong("clearedAt", 0)
        val membersObject = household.objectValue("members")
        val members = membersObject.keys().asSequence()
            .mapNotNull(membersObject::optJSONObject)
            .filter {
                val deleted = it.optJSONObject("deleted")
                deleted != null && deleted.optLong("updatedAt") > clearedAt && !deleted.optBoolean("value")
            }
            .map {
                FamilyMember(
                    it.optString("id"),
                    it.optJSONObject("displayName")?.optString("value").orEmpty(),
                    it.optJSONObject("relationshipLabel")?.optString("value").orEmpty(),
                )
            }
            .toList()

        return AppSnapshot(
            checklist = checklist,
            babyProfile = babyProfile,
            careEntries = care,
            hospital = hospital,
            familyName = household.stampedString("householdName"),
            familyMembers = members,
            recordedByMemberId = normalizeRecordedByMemberId(members),
            revision = revision,
        )
    }

    private fun decodeCare(event: JSONObject): CareEntry {
        val type = event.optString("type")
        val title = when (type) {
            "bottle" -> if (event.optString("milkType") == "formula") "配方奶" else "瓶喂母乳"
            "diaper" -> when (event.optString("kind")) {
                "dirty" -> "大便"
                "both" -> "尿布：都有"
                else -> "小便"
            }
            "breastfeeding" -> "亲喂"
            "pumping" -> "吸奶"
            "sleep" -> "睡眠"
            else -> "照护记录"
        }
        val detail = when (type) {
            "bottle" -> "${event.optInt("amountMl")} ml"
            "pumping" -> event.optInt("amountMl", 0).takeIf { it > 0 }?.let { "$it ml" }.orEmpty()
            else -> ""
        }
        val occurredAt = event.optString("occurredAt").ifBlank { event.optString("startAt") }
        return CareEntry(
            id = event.optString("id"),
            type = type,
            title = title,
            detail = detail,
            occurredAt = occurredAt,
            note = event.optString("note"),
        )
    }

    private fun nextTimestamp(root: JSONObject): Long =
        max(currentTimeMillis(), latestTimestamp(root)) + 1

    private fun currentTimeMillis(): Long = clock() + clockOffsetMs()

    private fun currentInstant(): String = Instant.ofEpochMilli(currentTimeMillis()).toString()

    private fun updateStampedField(fields: JSONObject, key: String, value: String, timestamp: Long): Boolean {
        if (fields.optJSONObject(key)?.optString("value").orEmpty() == value) return false
        fields.put(key, stamped(value, timestamp))
        return true
    }

    private fun recorderValue(root: JSONObject): Any = recordedByMemberId
        .takeIf { it in activeMemberIds(root) }
        ?: JSONObject.NULL

    private fun activeMemberIds(root: JSONObject): Set<String> {
        val household = root.objectValue("household")
        val clearedAt = household.optLong("clearedAt", 0)
        val members = household.objectValue("members")
        return members.keys().asSequence()
            .mapNotNull(members::optJSONObject)
            .filter { member ->
                val deleted = member.optJSONObject("deleted")
                deleted != null && deleted.optLong("updatedAt") > clearedAt && !deleted.optBoolean("value")
            }
            .map { it.optString("id") }
            .filter(String::isNotBlank)
            .toSet()
    }

    private fun normalizeRecordedByMemberId(members: List<FamilyMember>): String {
        if (recordedByMemberId.isBlank() || members.any { it.id == recordedByMemberId }) {
            return recordedByMemberId
        }
        recordedByMemberId = ""
        preferences?.edit()?.remove(RECORDED_BY_MEMBER_ID_KEY)?.apply()
        return ""
    }

    private fun defaultBag(category: String): String = when (category) {
        "documents" -> "documents_folder"
        "mom_labor", "mom_postpartum", "going_home" -> "mom_bag"
        "baby" -> "baby_bag"
        "partner" -> "dad_backpack"
        "last_minute" -> "last_minute"
        else -> "none"
    }

    private fun latestTimestamp(value: Any?): Long = when (value) {
        is JSONObject -> value.keys().asSequence().maxOfOrNull { key ->
            val child = value.opt(key)
            if (key in TIMESTAMP_KEYS && child is Number) child.toLong() else latestTimestamp(child)
        } ?: 0
        is JSONArray -> (0 until value.length()).maxOfOrNull { latestTimestamp(value.opt(it)) } ?: 0
        else -> 0
    }

    companion object {
        private const val INTERNAL_DOCUMENT_VERSION = 9
        private const val PREFERENCES_NAME = "dadkit_native_data"
        private const val SYNC_PREFERENCES_NAME = "dadkit_native_sync"
        private const val DOCUMENT_KEY = "family_document"
        private const val RECORDED_BY_MEMBER_ID_KEY = "recorded_by_member_id"
        internal const val SERVER_CLOCK_OFFSET_KEY = "server_clock_offset_ms"
        private val BABY_SEX_VALUES = setOf("girl", "boy", "unspecified")
        private val DIAPER_VALUES = setOf("wet", "dirty", "both")
        private val TIMESTAMP_KEYS = setOf("updatedAt", "createdAt", "deletedAt", "clearedAt", "growthUpdatedAt")
        private val HOSPITAL_FIELDS = listOf(
            "hospitalName", "campusName", "maternityPhone", "emergencyPhone", "address",
            "laborEntranceNote", "inpatientEntranceNote", "parkingNote", "admissionProcessNote",
            "companionRuleNote", "providedItemsNote", "restrictedItemsNote",
            "requiredDocumentsNote", "generalNote",
        )

        private fun stamped(value: Any, updatedAt: Long): JSONObject =
            JSONObject().put("value", value).put("updatedAt", updatedAt)
    }
}

internal fun JSONObject.objectValue(key: String): JSONObject =
    optJSONObject(key) ?: JSONObject().also { put(key, it) }

internal fun JSONObject.array(key: String): JSONArray =
    optJSONArray(key) ?: JSONArray().also { put(key, it) }

internal fun JSONObject.stampedString(key: String): String =
    optJSONObject(key)?.optString("value").orEmpty()

internal fun JSONArray.objects(): List<JSONObject> =
    (0 until length()).mapNotNull(::optJSONObject)

internal fun JSONArray.stringValues(): List<String> =
    (0 until length()).mapNotNull { optString(it).takeIf(String::isNotBlank) }

internal fun JSONArray.objectWithId(id: String): JSONObject? =
    objects().firstOrNull { it.optString("id") == id }

internal fun JSONArray.withoutId(id: String): JSONArray = JSONArray().also { next ->
    objects().filterNot { it.optString("id") == id }.forEach(next::put)
}
