package com.dadkit.mobile.data

data class ChecklistEntry(
    val id: String,
    val name: String,
    val category: String,
    val categoryLabel: String,
    val quantity: String,
    val note: String,
    val status: String,
    val source: String,
    val preparationKind: String,
)

data class CareEntry(
    val id: String,
    val type: String,
    val title: String,
    val detail: String,
    val occurredAt: String,
    val note: String,
)

data class BabyProfile(
    val nickname: String = "",
    val birthDate: String = "",
    val birthTime: String = "",
    val sex: String = "unspecified",
)

data class HospitalProfile(
    val hospitalName: String = "",
    val campusName: String = "",
    val maternityPhone: String = "",
    val emergencyPhone: String = "",
    val address: String = "",
    val laborEntranceNote: String = "",
    val inpatientEntranceNote: String = "",
    val parkingNote: String = "",
    val admissionProcessNote: String = "",
    val companionRuleNote: String = "",
    val providedItemsNote: String = "",
    val restrictedItemsNote: String = "",
    val requiredDocumentsNote: String = "",
    val generalNote: String = "",
)

data class FamilyMember(
    val id: String,
    val displayName: String,
    val relationship: String,
)

data class DataActionResult(
    val ok: Boolean,
    val changed: Boolean = false,
    val message: String = "",
) {
    companion object {
        fun success(changed: Boolean = true, message: String = "") =
            DataActionResult(ok = true, changed = changed, message = message)

        fun failure(message: String) =
            DataActionResult(ok = false, changed = false, message = message)
    }
}

data class SyncActionResult(
    val ok: Boolean,
    val message: String = "",
    val value: String = "",
)

data class AppSnapshot(
    val checklist: List<ChecklistEntry> = emptyList(),
    val babyProfile: BabyProfile = BabyProfile(),
    val careEntries: List<CareEntry> = emptyList(),
    val hospital: HospitalProfile = HospitalProfile(),
    val familyName: String = "",
    val familyMembers: List<FamilyMember> = emptyList(),
    val recordedByMemberId: String = "",
    val revision: Long = 0,
) {
    val preparedCount: Int
        get() = checklist.count { it.status == "packed" || it.status == "not_needed" }

    val progressPercent: Int
        get() = if (checklist.isEmpty()) 0 else preparedCount * 100 / checklist.size
}

data class SyncState(
    val connected: Boolean = false,
    val familyName: String = "",
    val syncing: Boolean = false,
    val lastSyncAt: String = "",
    val message: String = "",
    val isError: Boolean = false,
    val inviteLink: String = "",
)

val categoryLabels = linkedMapOf(
    "documents" to "证件包",
    "mom_labor" to "待产妈妈包",
    "mom_postpartum" to "产后妈妈包",
    "baby" to "宝宝包",
    "confinement_mom" to "月子妈妈",
    "confinement_baby" to "宝宝囤货",
    "partner" to "家人协作",
    "going_home" to "出院返家",
    "last_minute" to "临出门拿",
)

val customPreparationOptions = linkedMapOf(
    "pack_existing" to "家里已有",
    "buy_and_pack" to "需要购买",
    "buy_for_home" to "买了放家里",
    "wash_then_pack" to "需要清洗",
)

fun statusOptionsFor(preparationKind: String): List<String> = when (preparationKind) {
    "buy_and_pack", "buy_for_home" -> listOf("todo", "bought", "packed", "not_needed")
    "wash_then_pack" -> listOf("todo", "washed", "packed", "not_needed")
    "document" -> listOf("todo", "packed", "last_minute", "not_needed")
    "last_minute" -> listOf("todo", "last_minute", "packed", "not_needed")
    else -> listOf("todo", "packed", "not_needed")
}

fun statusLabelFor(status: String, preparationKind: String): String = when (preparationKind) {
    "document" -> mapOf(
        "todo" to "待整理",
        "packed" to "已放入证件包",
        "last_minute" to "临出门拿",
        "not_needed" to "不需要",
    )[status]
    "buy_and_pack" -> mapOf(
        "todo" to "待购买",
        "bought" to "已购买",
        "packed" to "已装包",
        "not_needed" to "不需要",
    )[status]
    "buy_for_home" -> mapOf(
        "todo" to "待购买",
        "bought" to "已购买",
        "packed" to "已就位",
        "not_needed" to "不需要",
    )[status]
    "wash_then_pack" -> mapOf(
        "todo" to "待清洗",
        "washed" to "已清洗",
        "packed" to "已装包",
        "not_needed" to "不需要",
    )[status]
    "last_minute" -> mapOf(
        "todo" to "待放到固定位置",
        "last_minute" to "临出门拿",
        "packed" to "已确认",
        "not_needed" to "不需要",
    )[status]
    "task", "install_or_place" -> mapOf(
        "todo" to "待完成",
        "packed" to "已完成",
        "not_needed" to "不需要",
    )[status]
    else -> mapOf(
        "todo" to "待准备",
        "packed" to "已装包",
        "not_needed" to "不需要",
    )[status]
} ?: when (status) {
    "bought" -> "已购买"
    "washed" -> "已清洗"
    "packed" -> "已完成"
    "last_minute" -> "临出门拿"
    "not_needed" -> "不需要"
    else -> "待处理"
}
