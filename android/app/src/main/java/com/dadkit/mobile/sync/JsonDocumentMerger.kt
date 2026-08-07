package com.dadkit.mobile.sync

import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import kotlin.math.max

/**
 * Entity-level last-write-wins merge shared by native pull and push.
 * Version fields are transport details and are intentionally never surfaced in UI.
 */
object JsonDocumentMerger {
    fun merge(local: JSONObject, remote: JSONObject): JSONObject {
        val result = JSONObject(local.toString())
        val tombstones = mergeNumberMap(
            local.optJSONObject("deletedCustomItems"),
            remote.optJSONObject("deletedCustomItems"),
        )
        val hiddenStamps = mergeStampedMap(
            local.optJSONObject("hiddenTemplateItemStamps"),
            remote.optJSONObject("hiddenTemplateItemStamps"),
        )
        val customItems = mergeEntityArrays(
            local.optJSONArray("customItems"),
            remote.optJSONArray("customItems"),
        ).filter { item ->
            val deletedAt = tombstones.optLong(item.optString("id"), Long.MIN_VALUE)
            deletedAt == Long.MIN_VALUE || deletedAt <= item.optLong("updatedAt", 0)
        }
        val checklist = mergeEntityArrays(
            local.optJSONArray("checklist"),
            remote.optJSONArray("checklist"),
        ).filter { item ->
            if (item.optString("source") != "user") return@filter true
            val deletedAt = tombstones.optLong(item.optString("id"), Long.MIN_VALUE)
            deletedAt == Long.MIN_VALUE || deletedAt <= item.optLong("updatedAt", 0)
        }

        result.put("checklist", checklist.toObjectJsonArray())
        result.put("customItems", customItems.toObjectJsonArray())
        result.put("deletedCustomItems", tombstones)
        result.put("hiddenTemplateItemStamps", hiddenStamps)
        result.put("hiddenTemplateItemIds", hiddenStamps.keys().asSequence()
            .filter { hiddenStamps.optJSONObject(it)?.optBoolean("hidden") == true }
            .sorted()
            .toList()
            .toStringJsonArray())

        val localGrowthAt = local.optLong("growthUpdatedAt", 0)
        val remoteGrowthAt = remote.optLong("growthUpdatedAt", 0)
        if (remoteGrowthAt > localGrowthAt) {
            remote.optJSONObject("growth")?.let { result.put("growth", copy(it)) }
            result.put("growthUpdatedAt", remoteGrowthAt)
        }

        result.put("hospital", mergeHospital(local.optJSONObject("hospital"), remote.optJSONObject("hospital")))
        result.put("planning", mergePlanning(local.optJSONObject("planning"), remote.optJSONObject("planning")))
        result.put("baby", mergeBaby(local.optJSONObject("baby"), remote.optJSONObject("baby")))
        result.put("household", mergeHousehold(local.optJSONObject("household"), remote.optJSONObject("household")))
        result.put("exportedAt", Instant.now().toString())
        return result
    }

    private fun mergeHospital(local: JSONObject?, remote: JSONObject?): JSONObject {
        val leftFields = local?.optJSONObject("fields") ?: JSONObject()
        val rightFields = remote?.optJSONObject("fields") ?: JSONObject()
        val fields = JSONObject()
        (leftFields.keys().asSequence().toSet() + rightFields.keys().asSequence().toSet())
            .sorted()
            .forEach { key -> fields.put(key, newer(leftFields.optJSONObject(key), rightFields.optJSONObject(key))) }
        return JSONObject().put("version", 1).put("fields", fields)
    }

    private fun mergePlanning(local: JSONObject?, remote: JSONObject?): JSONObject {
        val clearedAt = max(local?.optLong("clearedAt", 0) ?: 0, remote?.optLong("clearedAt", 0) ?: 0)
        val leftItems = local?.optJSONObject("items") ?: JSONObject()
        val rightItems = remote?.optJSONObject("items") ?: JSONObject()
        val items = JSONObject()
        (leftItems.keys().asSequence().toSet() + rightItems.keys().asSequence().toSet())
            .sorted()
            .forEach { id ->
                val left = leftItems.optJSONObject(id)
                val right = rightItems.optJSONObject(id)
                val record = JSONObject()
                var effective = false
                PLANNING_FIELDS.forEach { field ->
                    val selected = newer(left?.optJSONObject(field), right?.optJSONObject(field))
                    val updatedAt = selected.optLong("updatedAt", 0)
                    if (updatedAt > clearedAt) effective = true
                    record.put(field, if (selected.length() > 0) selected else emptyPlanningField(field, clearedAt))
                }
                if (effective) items.put(id, record)
            }
        return JSONObject().put("version", 2).put("clearedAt", clearedAt).put("items", items)
    }

    private fun mergeBaby(local: JSONObject?, remote: JSONObject?): JSONObject {
        val leftProfile = local?.optJSONObject("profile") ?: JSONObject()
        val rightProfile = remote?.optJSONObject("profile") ?: JSONObject()
        val profileCleared = max(leftProfile.optLong("clearedAt", 0), rightProfile.optLong("clearedAt", 0))
        val leftFields = leftProfile.optJSONObject("fields") ?: JSONObject()
        val rightFields = rightProfile.optJSONObject("fields") ?: JSONObject()
        val fields = JSONObject()
        BABY_FIELDS.forEach { key ->
            val selected = newer(leftFields.optJSONObject(key), rightFields.optJSONObject(key))
            fields.put(key, if (selected.optLong("updatedAt", 0) > profileCleared) {
                selected
            } else {
                JSONObject().put("value", if (key == "sex") "unspecified" else "").put("updatedAt", profileCleared)
            })
        }

        val leftCare = local?.optJSONObject("care") ?: JSONObject()
        val rightCare = remote?.optJSONObject("care") ?: JSONObject()
        val careCleared = max(leftCare.optLong("clearedAt", 0), rightCare.optLong("clearedAt", 0))
        val events = mergeEntityArrays(leftCare.optJSONArray("events"), rightCare.optJSONArray("events"))
            .filter { it.optLong("updatedAt", 0) > careCleared }

        return JSONObject()
            .put("version", 2)
            .put("profile", JSONObject()
                .put("version", 1)
                .put("clearedAt", profileCleared)
                .put("fields", fields))
            .put("care", JSONObject()
                .put("version", 2)
                .put("clearedAt", careCleared)
                .put("events", events.toObjectJsonArray()))
    }

    private fun mergeHousehold(local: JSONObject?, remote: JSONObject?): JSONObject {
        val clearedAt = max(local?.optLong("clearedAt", 0) ?: 0, remote?.optLong("clearedAt", 0) ?: 0)
        val householdName = newer(local?.optJSONObject("householdName"), remote?.optJSONObject("householdName"))
            .takeIf { it.optLong("updatedAt", 0) > clearedAt }
            ?: JSONObject().put("value", "").put("updatedAt", clearedAt)
        val leftMembers = local?.optJSONObject("members") ?: JSONObject()
        val rightMembers = remote?.optJSONObject("members") ?: JSONObject()
        val members = JSONObject()
        (leftMembers.keys().asSequence().toSet() + rightMembers.keys().asSequence().toSet())
            .sorted()
            .forEach { id ->
                val left = leftMembers.optJSONObject(id)
                val right = rightMembers.optJSONObject(id)
                val merged = if (left != null && right != null) {
                    JSONObject()
                        .put("id", id)
                        .put("createdAt", minOf(left.optLong("createdAt"), right.optLong("createdAt")))
                        .put("displayName", newer(left.optJSONObject("displayName"), right.optJSONObject("displayName")))
                        .put("relationshipLabel", newer(left.optJSONObject("relationshipLabel"), right.optJSONObject("relationshipLabel")))
                        .put("deleted", newer(left.optJSONObject("deleted"), right.optJSONObject("deleted")))
                } else {
                    copy(left ?: right ?: JSONObject())
                }
                val latest = maxOf(
                    merged.optJSONObject("displayName")?.optLong("updatedAt", 0) ?: 0,
                    merged.optJSONObject("relationshipLabel")?.optLong("updatedAt", 0) ?: 0,
                    merged.optJSONObject("deleted")?.optLong("updatedAt", 0) ?: 0,
                )
                if (latest > clearedAt) members.put(id, merged)
            }
        return JSONObject()
            .put("version", 1)
            .put("clearedAt", clearedAt)
            .put("householdName", householdName)
            .put("members", members)
    }

    private fun mergeEntityArrays(left: JSONArray?, right: JSONArray?): List<JSONObject> {
        val merged = linkedMapOf<String, JSONObject>()
        sequenceOf(left, right).filterNotNull().forEach { array ->
            for (index in 0 until array.length()) {
                val candidate = array.optJSONObject(index) ?: continue
                val id = candidate.optString("id")
                if (id.isBlank()) continue
                val current = merged[id]
                if (current == null || candidate.optLong("updatedAt", 0) > current.optLong("updatedAt", 0)) {
                    merged[id] = copy(candidate)
                }
            }
        }
        return merged.values.toList()
    }

    private fun mergeNumberMap(left: JSONObject?, right: JSONObject?): JSONObject {
        val result = JSONObject()
        val keys = (left?.keys()?.asSequence()?.toSet() ?: emptySet()) +
            (right?.keys()?.asSequence()?.toSet() ?: emptySet())
        keys.sorted().forEach { key ->
            result.put(key, max(left?.optLong(key, 0) ?: 0, right?.optLong(key, 0) ?: 0))
        }
        return result
    }

    private fun mergeStampedMap(left: JSONObject?, right: JSONObject?): JSONObject {
        val result = JSONObject()
        val keys = (left?.keys()?.asSequence()?.toSet() ?: emptySet()) +
            (right?.keys()?.asSequence()?.toSet() ?: emptySet())
        keys.sorted().forEach { key -> result.put(key, newer(left?.optJSONObject(key), right?.optJSONObject(key))) }
        return result
    }

    private fun newer(left: JSONObject?, right: JSONObject?): JSONObject = when {
        left == null -> copy(right ?: JSONObject())
        right == null -> copy(left)
        right.optLong("updatedAt", 0) > left.optLong("updatedAt", 0) -> copy(right)
        else -> copy(left)
    }

    private fun emptyPlanningField(field: String, updatedAt: Long): JSONObject {
        val value: Any = when (field) {
            "assigneeIds" -> JSONArray()
            "estimatedPriceFen", "actualPriceFen" -> JSONObject.NULL
            else -> ""
        }
        return JSONObject().put("value", value).put("updatedAt", updatedAt)
    }

    private fun copy(value: JSONObject): JSONObject = JSONObject(value.toString())

    private fun List<JSONObject>.toObjectJsonArray(): JSONArray = JSONArray().also { array ->
        forEach { array.put(copy(it)) }
    }

    private fun List<String>.toStringJsonArray(): JSONArray = JSONArray().also { array ->
        forEach(array::put)
    }

    private val PLANNING_FIELDS = listOf(
        "assigneeIds", "dueDate", "estimatedPriceFen", "actualPriceFen", "purchaseChannel", "storageLocation",
    )
    private val BABY_FIELDS = listOf("nickname", "birthDate", "birthTime", "sex")
}
