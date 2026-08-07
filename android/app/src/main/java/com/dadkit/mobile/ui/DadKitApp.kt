package com.dadkit.mobile.ui

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Backup
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChildCare
import androidx.compose.material.icons.filled.CloudSync
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.FamilyRestroom
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.LocalHospital
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Restore
import androidx.compose.material.icons.filled.TaskAlt
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.dadkit.mobile.data.AppSnapshot
import com.dadkit.mobile.data.BabyProfile
import com.dadkit.mobile.data.CareEntry
import com.dadkit.mobile.data.ChecklistEntry
import com.dadkit.mobile.data.DadKitRepository
import com.dadkit.mobile.data.DataActionResult
import com.dadkit.mobile.data.FamilyMember
import com.dadkit.mobile.data.HospitalProfile
import com.dadkit.mobile.data.SyncActionResult
import com.dadkit.mobile.data.SyncState
import com.dadkit.mobile.data.categoryLabels
import com.dadkit.mobile.data.customPreparationOptions
import com.dadkit.mobile.data.statusLabelFor
import com.dadkit.mobile.data.statusOptionsFor
import com.dadkit.mobile.sync.AppUpdateInfo
import com.dadkit.mobile.sync.NativeSyncClient
import com.dadkit.mobile.sync.NativeUpdateClient
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private enum class Screen(val title: String) {
    HOME("DadKit"),
    CHECKLIST("待产清单"),
    BABY("宝宝照护"),
    TOOLS("实用工具"),
    PROFILE("我的"),
    HOSPITAL("医院档案"),
    FAMILY("家庭成员"),
    SYNC("家庭同步"),
    BACKUP("备份与恢复"),
}

private data class BottomDestination(
    val screen: Screen,
    val label: String,
    val icon: ImageVector,
)

private val bottomDestinations = listOf(
    BottomDestination(Screen.HOME, "首页", Icons.Default.Home),
    BottomDestination(Screen.CHECKLIST, "清单", Icons.Default.TaskAlt),
    BottomDestination(Screen.BABY, "宝宝", Icons.Default.ChildCare),
    BottomDestination(Screen.TOOLS, "工具", Icons.Default.Build),
    BottomDestination(Screen.PROFILE, "我的", Icons.Default.Person),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DadKitApp(
    repository: DadKitRepository,
    syncClient: NativeSyncClient,
    updateClient: NativeUpdateClient,
) {
    val snapshot by repository.snapshot.collectAsStateWithLifecycle()
    val syncState by syncClient.state.collectAsStateWithLifecycle()
    var screen by rememberSaveable { mutableStateOf(Screen.HOME) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var pendingBackup by remember { mutableStateOf("") }
    var availableUpdate by remember { mutableStateOf<AppUpdateInfo?>(null) }

    val saveBackup = rememberLauncherForActivityResult(
        ActivityResultContracts.CreateDocument("application/json"),
    ) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        val result = runCatching {
            context.contentResolver.openOutputStream(uri)?.bufferedWriter()?.use { it.write(pendingBackup) }
                ?: error("无法打开保存位置")
        }
        scope.launch {
            snackbar.showSnackbar(if (result.isSuccess) "家庭备份已保存。" else "保存失败，请重新选择位置。")
        }
    }
    val openBackup = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        val result = runCatching {
            val raw = context.contentResolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() }
                ?: error("无法打开文件")
            repository.replaceFamilyData(raw)
        }.getOrElse { DataActionResult.failure("无法读取这个备份文件。") }
        scope.launch {
            snackbar.showSnackbar(if (result.ok) "家庭数据已恢复。" else result.message)
        }
    }

    fun report(result: DataActionResult, success: String = "已保存。") {
        scope.launch { snackbar.showSnackbar(if (result.ok) success else result.message) }
    }

    fun reportSync(result: SyncActionResult) {
        scope.launch { snackbar.showSnackbar(result.message.ifBlank { if (result.ok) "操作成功。" else "操作失败。" }) }
    }

    fun goBack() {
        screen = when (screen) {
            Screen.HOSPITAL, Screen.BACKUP -> Screen.TOOLS
            Screen.FAMILY, Screen.SYNC -> Screen.PROFILE
            else -> Screen.HOME
        }
    }

    BackHandler(enabled = screen !in bottomDestinations.map { it.screen }) { goBack() }

    LaunchedEffect(Unit) {
        if (syncState.connected) syncClient.syncNow()
    }

    LaunchedEffect(Unit) {
        availableUpdate = updateClient.checkForUpdate()
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        snackbarHost = { SnackbarHost(snackbar) },
        topBar = {
            TopAppBar(
                title = { Text(screen.title, fontWeight = FontWeight.SemiBold) },
                navigationIcon = {
                    if (screen !in bottomDestinations.map { it.screen }) {
                        IconButton(onClick = ::goBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                        }
                    }
                },
            )
        },
        bottomBar = {
            NavigationBar {
                bottomDestinations.forEach { destination ->
                    val selected = rootScreenFor(screen) == destination.screen
                    NavigationBarItem(
                        selected = selected,
                        onClick = { screen = destination.screen },
                        icon = { Icon(destination.icon, contentDescription = null) },
                        label = { Text(destination.label) },
                    )
                }
            }
        },
    ) { padding ->
        when (screen) {
            Screen.HOME -> HomeScreen(snapshot, padding, onNavigate = { screen = it })
            Screen.CHECKLIST -> ChecklistScreen(snapshot, padding, repository, ::report)
            Screen.BABY -> BabyScreen(snapshot, padding, repository, ::report)
            Screen.TOOLS -> ToolsScreen(snapshot, padding, onNavigate = { screen = it })
            Screen.PROFILE -> ProfileScreen(snapshot, syncState, padding, onNavigate = { screen = it })
            Screen.HOSPITAL -> HospitalScreen(snapshot, padding, repository, ::report)
            Screen.FAMILY -> FamilyScreen(snapshot, padding, repository, ::report)
            Screen.SYNC -> SyncScreen(syncState, padding, syncClient, ::reportSync)
            Screen.BACKUP -> BackupScreen(
                padding = padding,
                onSave = {
                    pendingBackup = repository.exportFamilyData()
                    saveBackup.launch("DadKit-家庭备份-${LocalDate.now()}.json")
                },
                onRestore = { openBackup.launch(arrayOf("application/json", "text/plain", "application/octet-stream")) },
            )
        }
    }

    availableUpdate?.let { update ->
        AlertDialog(
            onDismissRequest = { availableUpdate = null },
            title = { Text("发现新版本 ${update.versionName}") },
            text = {
                Text(update.notes.ifBlank { "新版本已经可以下载。" })
            },
            confirmButton = {
                TextButton(onClick = {
                    val opened = runCatching {
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(update.downloadUrl)))
                    }.isSuccess
                    availableUpdate = null
                    if (!opened) scope.launch { snackbar.showSnackbar("无法打开下载页面，请稍后重试。") }
                }) { Text("下载更新") }
            },
            dismissButton = {
                TextButton(onClick = { availableUpdate = null }) { Text("稍后") }
            },
        )
    }
}

private fun rootScreenFor(screen: Screen): Screen = when (screen) {
    Screen.HOSPITAL, Screen.BACKUP -> Screen.TOOLS
    Screen.FAMILY, Screen.SYNC -> Screen.PROFILE
    else -> screen
}

@Composable
private fun HomeScreen(snapshot: AppSnapshot, padding: PaddingValues, onNavigate: (Screen) -> Unit) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(padding),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Text(
                text = snapshot.babyProfile.nickname.takeIf(String::isNotBlank)?.let { "你好，$it 的家人" }
                    ?: "一起把待产准备好",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
            )
            Text("数据默认保存在这台设备中。", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("待产清单", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        Text("${snapshot.progressPercent}%", fontWeight = FontWeight.Bold)
                    }
                    LinearProgressIndicator(
                        progress = { snapshot.progressPercent / 100f },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Text("已准备 ${snapshot.preparedCount} / ${snapshot.checklist.size} 项")
                    Button(onClick = { onNavigate(Screen.CHECKLIST) }) { Text("继续准备") }
                }
            }
        }
        item { Text("快捷入口", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold) }
        item {
            ActionCard(Icons.Default.ChildCare, "记录宝宝照护", "奶量、尿布随手记") { onNavigate(Screen.BABY) }
        }
        item {
            ActionCard(Icons.Default.LocalHospital, "医院档案", "电话、地址、停车位置") { onNavigate(Screen.HOSPITAL) }
        }
        item {
            ActionCard(Icons.Default.CloudSync, "家庭同步", "让家人的设备保持一致") { onNavigate(Screen.SYNC) }
        }
        if (snapshot.checklist.isNotEmpty()) {
            item { Text("接下来准备", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold) }
            items(snapshot.checklist.filter { it.status == "todo" }.take(4), key = { it.id }) { item ->
                Card(onClick = { onNavigate(Screen.CHECKLIST) }) {
                    Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.RadioButtonUnchecked, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(item.name, fontWeight = FontWeight.Medium)
                            Text(item.categoryLabel, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null)
                    }
                }
            }
        }
    }
}

@Composable
private fun ActionCard(icon: ImageVector, title: String, subtitle: String, onClick: () -> Unit) {
    Card(onClick = onClick) {
        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(30.dp))
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(title, fontWeight = FontWeight.SemiBold)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null)
        }
    }
}

@Composable
private fun ChecklistScreen(
    snapshot: AppSnapshot,
    padding: PaddingValues,
    repository: DadKitRepository,
    report: (DataActionResult, String) -> Unit,
) {
    var selectedCategory by rememberSaveable { mutableStateOf("all") }
    var showAdd by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf<ChecklistEntry?>(null) }
    var deleting by remember { mutableStateOf<ChecklistEntry?>(null) }
    var search by rememberSaveable { mutableStateOf("") }
    val categories = snapshot.checklist.map { it.category to it.categoryLabel }.distinctBy { it.first }
    val cleanSearch = search.trim()
    val visible = snapshot.checklist.filter { item ->
        (selectedCategory == "all" || item.category == selectedCategory) &&
            (cleanSearch.isEmpty() || item.name.contains(cleanSearch, ignoreCase = true) ||
                item.note.contains(cleanSearch, ignoreCase = true))
    }

    Column(Modifier.fillMaxSize().padding(padding)) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("${snapshot.preparedCount}/${snapshot.checklist.size} 项已准备", modifier = Modifier.weight(1f))
            Button(onClick = { showAdd = true }) {
                Icon(Icons.Default.Add, contentDescription = null)
                Spacer(Modifier.width(6.dp))
                Text("添加")
            }
        }
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            item {
                FilterChip(selected = selectedCategory == "all", onClick = { selectedCategory = "all" }, label = { Text("全部") })
            }
            items(categories, key = { it.first }) { (key, label) ->
                FilterChip(selected = selectedCategory == key, onClick = { selectedCategory = key }, label = { Text(label) })
            }
        }
        OutlinedTextField(
            value = search,
            onValueChange = { search = it },
            label = { Text("搜索名称或备注") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
        )
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            if (visible.isEmpty()) {
                item { EmptyCard(if (cleanSearch.isEmpty()) "这个分类还没有物品。" else "没有找到包含“$cleanSearch”的物品。") }
            } else {
                items(visible, key = { it.id }) { item ->
                    ChecklistRow(
                        item = item,
                        onToggle = {
                            val result = repository.toggleChecklistItem(item.id)
                            if (!result.ok) report(result, "")
                        },
                        onEdit = { editing = item },
                        onDelete = { deleting = item },
                    )
                }
            }
        }
    }

    if (showAdd) {
        AddChecklistDialog(
            onDismiss = { showAdd = false },
            onSave = { name, category, quantity, note, preparationKind ->
                repository.addChecklistItem(name, category, quantity, note, preparationKind).also {
                    if (it.ok) showAdd = false
                    report(it, "已加入清单。")
                }
            },
        )
    }
    editing?.let { item ->
        EditChecklistDialog(
            item = item,
            onDismiss = { editing = null },
            onSave = { name, category, quantity, note, status ->
                val fields = repository.updateChecklistItem(item.id, name, category, quantity, note)
                val result = if (!fields.ok) fields else {
                    val statusResult = repository.setChecklistItemStatus(item.id, status)
                    if (!statusResult.ok) statusResult
                    else DataActionResult.success(changed = fields.changed || statusResult.changed)
                }
                if (result.ok) editing = null
                report(result, if (result.changed) "物品已更新。" else "物品没有变化。")
            },
        )
    }
    deleting?.let { item ->
        AlertDialog(
            onDismissRequest = { deleting = null },
            title = { Text("从清单中移除？") },
            text = { Text("“${item.name}”会从这台设备和已连接的家庭中移除。") },
            confirmButton = {
                TextButton(onClick = {
                    val result = repository.removeChecklistItem(item.id)
                    if (result.ok) deleting = null
                    report(result, "已从清单移除。")
                }) { Text("移除") }
            },
            dismissButton = { TextButton(onClick = { deleting = null }) { Text("取消") } },
        )
    }
}

@Composable
private fun ChecklistRow(item: ChecklistEntry, onToggle: () -> Unit, onEdit: () -> Unit, onDelete: () -> Unit) {
    val done = item.status == "packed" || item.status == "not_needed"
    Card(onClick = onToggle) {
        Row(Modifier.fillMaxWidth().padding(start = 14.dp, top = 10.dp, bottom = 10.dp, end = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(
                if (done) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                contentDescription = if (done) "标记为未完成" else "更新准备进度",
                tint = if (done) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline,
            )
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(item.name, fontWeight = FontWeight.Medium, maxLines = 2, overflow = TextOverflow.Ellipsis)
                val details = listOf(item.categoryLabel, item.quantity, statusLabelFor(item.status, item.preparationKind)).filter(String::isNotBlank).joinToString(" · ")
                Text(details, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (item.note.isNotBlank()) Text(item.note, style = MaterialTheme.typography.bodySmall, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
            IconButton(onClick = onEdit) { Icon(Icons.Default.Edit, contentDescription = "编辑") }
            IconButton(onClick = onDelete) { Icon(Icons.Default.Delete, contentDescription = "移除") }
        }
    }
}

@Composable
private fun AddChecklistDialog(
    onDismiss: () -> Unit,
    onSave: (String, String, String, String, String) -> Unit,
) {
    var name by remember { mutableStateOf("") }
    var quantity by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("mom_labor") }
    var preparationKind by remember { mutableStateOf("pack_existing") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("添加清单物品") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(name, { name = it }, label = { Text("物品名称") }, singleLine = true)
                OutlinedTextField(quantity, { quantity = it }, label = { Text("数量（可选）") }, singleLine = true)
                Text("分类", style = MaterialTheme.typography.labelLarge)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(categoryLabels.entries.toList(), key = { it.key }) { entry ->
                        FilterChip(selected = category == entry.key, onClick = { category = entry.key }, label = { Text(entry.value) })
                    }
                }
                Text("当前情况", style = MaterialTheme.typography.labelLarge)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(customPreparationOptions.entries.toList(), key = { it.key }) { entry ->
                        FilterChip(
                            selected = preparationKind == entry.key,
                            onClick = { preparationKind = entry.key },
                            label = { Text(entry.value) },
                        )
                    }
                }
                OutlinedTextField(note, { note = it }, label = { Text("备注（可选）") }, minLines = 2)
            }
        },
        confirmButton = { Button(onClick = { onSave(name, category, quantity, note, preparationKind) }) { Text("添加") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("取消") } },
    )
}

@Composable
private fun EditChecklistDialog(
    item: ChecklistEntry,
    onDismiss: () -> Unit,
    onSave: (String, String, String, String, String) -> Unit,
) {
    var name by remember(item.id) { mutableStateOf(item.name) }
    var category by remember(item.id) { mutableStateOf(item.category) }
    var quantity by remember(item.id) { mutableStateOf(item.quantity) }
    var note by remember(item.id) { mutableStateOf(item.note) }
    var status by remember(item.id) { mutableStateOf(item.status) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("编辑物品") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(name, { name = it }, label = { Text("物品名称") }, singleLine = true)
                OutlinedTextField(quantity, { quantity = it }, label = { Text("数量") }, singleLine = true)
                Text("分类", style = MaterialTheme.typography.labelLarge)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(categoryLabels.entries.toList(), key = { it.key }) { entry ->
                        FilterChip(selected = category == entry.key, onClick = { category = entry.key }, label = { Text(entry.value) })
                    }
                }
                Text("准备状态", style = MaterialTheme.typography.labelLarge)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(statusOptionsFor(item.preparationKind), key = { it }) { option ->
                        FilterChip(
                            selected = status == option,
                            onClick = { status = option },
                            label = { Text(statusLabelFor(option, item.preparationKind)) },
                        )
                    }
                }
                OutlinedTextField(note, { note = it }, label = { Text("备注") }, minLines = 2)
            }
        },
        confirmButton = { Button(onClick = { onSave(name, category, quantity, note, status) }) { Text("保存") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("取消") } },
    )
}

@Composable
private fun BabyScreen(
    snapshot: AppSnapshot,
    padding: PaddingValues,
    repository: DadKitRepository,
    report: (DataActionResult, String) -> Unit,
) {
    var editProfile by remember { mutableStateOf(false) }
    var showBottle by remember { mutableStateOf(false) }
    var deleteEntry by remember { mutableStateOf<CareEntry?>(null) }
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(padding),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Card {
                Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.ChildCare, contentDescription = null, modifier = Modifier.size(38.dp), tint = MaterialTheme.colorScheme.primary)
                    Spacer(Modifier.width(14.dp))
                    Column(Modifier.weight(1f)) {
                        Text(snapshot.babyProfile.nickname.ifBlank { "宝宝资料" }, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        Text(babyProfileSummary(snapshot.babyProfile), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    IconButton(onClick = { editProfile = true }) { Icon(Icons.Default.Edit, contentDescription = "编辑宝宝资料") }
                }
            }
        }
        item { Text("快速记录", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold) }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = { showBottle = true }, modifier = Modifier.weight(1f)) { Text("记录喂奶") }
                OutlinedButton(
                    onClick = { report(repository.addDiaperRecord("wet"), "已记录小便。") },
                    modifier = Modifier.weight(1f),
                ) { Text("小便") }
                OutlinedButton(
                    onClick = { report(repository.addDiaperRecord("dirty"), "已记录大便。") },
                    modifier = Modifier.weight(1f),
                ) { Text("大便") }
            }
        }
        item { Text("最近记录", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold) }
        if (snapshot.careEntries.isEmpty()) {
            item { EmptyCard("还没有照护记录，先记下第一条吧。") }
        } else {
            items(snapshot.careEntries, key = { it.id }) { entry ->
                Card {
                    Row(Modifier.fillMaxWidth().padding(start = 16.dp, top = 12.dp, bottom = 12.dp, end = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(listOf(entry.title, entry.detail).filter(String::isNotBlank).joinToString(" · "), fontWeight = FontWeight.Medium)
                            Text(formatTimestamp(entry.occurredAt), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            if (entry.note.isNotBlank()) Text(entry.note, style = MaterialTheme.typography.bodySmall)
                        }
                        IconButton(onClick = { deleteEntry = entry }) { Icon(Icons.Default.Delete, contentDescription = "删除记录") }
                    }
                }
            }
        }
    }
    if (editProfile) {
        BabyProfileDialog(snapshot.babyProfile, onDismiss = { editProfile = false }) { profile ->
            repository.saveBabyProfile(profile).also {
                if (it.ok) editProfile = false
                report(it, "宝宝资料已保存。")
            }
        }
    }
    if (showBottle) {
        BottleDialog(onDismiss = { showBottle = false }) { amount, formula, note ->
            repository.addBottleRecord(amount, formula, note).also {
                if (it.ok) showBottle = false
                report(it, "喂奶记录已保存。")
            }
        }
    }
    deleteEntry?.let { entry ->
        AlertDialog(
            onDismissRequest = { deleteEntry = null },
            title = { Text("删除这条记录？") },
            text = { Text("删除后，已连接的家庭设备也会同步移除。") },
            confirmButton = {
                TextButton(onClick = {
                    val result = repository.removeCareRecord(entry.id)
                    if (result.ok) deleteEntry = null
                    report(result, "记录已删除。")
                }) { Text("删除") }
            },
            dismissButton = { TextButton(onClick = { deleteEntry = null }) { Text("取消") } },
        )
    }
}

private fun babyProfileSummary(profile: BabyProfile): String = listOf(
    profile.birthDate.takeIf(String::isNotBlank)?.let { "生日 $it" },
    when (profile.sex) { "boy" -> "男宝宝"; "girl" -> "女宝宝"; else -> null },
).filterNotNull().joinToString(" · ").ifBlank { "填写昵称和出生信息" }

@Composable
private fun BabyProfileDialog(profile: BabyProfile, onDismiss: () -> Unit, onSave: (BabyProfile) -> Unit) {
    var nickname by remember { mutableStateOf(profile.nickname) }
    var birthDate by remember { mutableStateOf(profile.birthDate) }
    var birthTime by remember { mutableStateOf(profile.birthTime) }
    var sex by remember { mutableStateOf(profile.sex) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("宝宝资料") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(nickname, { nickname = it }, label = { Text("昵称") }, singleLine = true)
                OutlinedTextField(birthDate, { birthDate = it }, label = { Text("出生日期（如 2026-08-07）") }, singleLine = true)
                OutlinedTextField(birthTime, { birthTime = it }, label = { Text("出生时间（如 08:30）") }, singleLine = true)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("unspecified" to "暂不填写", "boy" to "男宝宝", "girl" to "女宝宝").forEach { (value, label) ->
                        FilterChip(selected = sex == value, onClick = { sex = value }, label = { Text(label) })
                    }
                }
            }
        },
        confirmButton = { Button(onClick = { onSave(BabyProfile(nickname, birthDate, birthTime, sex)) }) { Text("保存") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("取消") } },
    )
}

@Composable
private fun BottleDialog(onDismiss: () -> Unit, onSave: (Int, Boolean, String) -> Unit) {
    var amount by remember { mutableStateOf("90") }
    var formula by remember { mutableStateOf(false) }
    var note by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("记录喂奶") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    amount,
                    { amount = it.filter(Char::isDigit).take(4) },
                    label = { Text("奶量（ml）") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(selected = !formula, onClick = { formula = false }, label = { Text("瓶喂母乳") })
                    FilterChip(selected = formula, onClick = { formula = true }, label = { Text("配方奶") })
                }
                OutlinedTextField(note, { note = it }, label = { Text("备注（可选）") })
            }
        },
        confirmButton = { Button(onClick = { onSave(amount.toIntOrNull() ?: 0, formula, note) }) { Text("保存") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("取消") } },
    )
}

@Composable
private fun ToolsScreen(snapshot: AppSnapshot, padding: PaddingValues, onNavigate: (Screen) -> Unit) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(padding),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { Text("把重要信息放在随手可查的位置。", color = MaterialTheme.colorScheme.onSurfaceVariant) }
        item {
            ActionCard(
                Icons.Default.LocalHospital,
                "医院档案",
                snapshot.hospital.hospitalName.ifBlank { "记录医院、电话、地址和停车位置" },
            ) { onNavigate(Screen.HOSPITAL) }
        }
        item { ActionCard(Icons.Default.FamilyRestroom, "家庭成员", "维护一起准备和照护的家人") { onNavigate(Screen.FAMILY) } }
        item { ActionCard(Icons.Default.Backup, "备份与恢复", "把家庭数据保存成一个备份文件") { onNavigate(Screen.BACKUP) } }
    }
}

@Composable
private fun ProfileScreen(
    snapshot: AppSnapshot,
    syncState: SyncState,
    padding: PaddingValues,
    onNavigate: (Screen) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(padding),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
                Column(Modifier.fillMaxWidth().padding(18.dp)) {
                    Text(snapshot.familyName.ifBlank { "我的家庭" }, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Text("${snapshot.familyMembers.size} 位家庭成员 · 数据默认仅保存在设备中")
                }
            }
        }
        item {
            ActionCard(
                Icons.Default.CloudSync,
                "家庭同步",
                if (syncState.connected) "已连接 ${syncState.familyName.ifBlank { "我的家庭" }}" else "连接家人的设备",
            ) { onNavigate(Screen.SYNC) }
        }
        item { ActionCard(Icons.Default.FamilyRestroom, "家庭成员", "家庭名称与成员称呼") { onNavigate(Screen.FAMILY) } }
        item { ActionCard(Icons.Default.Backup, "备份与恢复", "导出或恢复家庭数据") { onNavigate(Screen.BACKUP) } }
        item {
            Card {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("隐私说明", fontWeight = FontWeight.SemiBold)
                    Text("不连接家庭同步时，清单和照护记录只保存在这台设备里。", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

@Composable
private fun HospitalScreen(
    snapshot: AppSnapshot,
    padding: PaddingValues,
    repository: DadKitRepository,
    report: (DataActionResult, String) -> Unit,
) {
    var profile by remember(snapshot.revision) { mutableStateOf(snapshot.hospital) }
    Column(
        Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text("把急用的信息提前记好，断网时也能查看。", color = MaterialTheme.colorScheme.onSurfaceVariant)
        OutlinedTextField(profile.hospitalName, { profile = profile.copy(hospitalName = it) }, label = { Text("医院名称") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(profile.campusName, { profile = profile.copy(campusName = it) }, label = { Text("院区") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(profile.maternityPhone, { profile = profile.copy(maternityPhone = it) }, label = { Text("产科 / 住院电话") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone), modifier = Modifier.fillMaxWidth())
        OutlinedTextField(profile.emergencyPhone, { profile = profile.copy(emergencyPhone = it) }, label = { Text("急诊电话") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone), modifier = Modifier.fillMaxWidth())
        OutlinedTextField(profile.address, { profile = profile.copy(address = it) }, label = { Text("医院地址") }, minLines = 2, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(profile.laborEntranceNote, { profile = profile.copy(laborEntranceNote = it) }, label = { Text("待产或产科入口") }, minLines = 3, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(profile.inpatientEntranceNote, { profile = profile.copy(inpatientEntranceNote = it) }, label = { Text("住院办理位置") }, minLines = 3, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(profile.parkingNote, { profile = profile.copy(parkingNote = it) }, label = { Text("停车位置") }, minLines = 3, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(profile.admissionProcessNote, { profile = profile.copy(admissionProcessNote = it) }, label = { Text("入院流程") }, minLines = 3, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(profile.companionRuleNote, { profile = profile.copy(companionRuleNote = it) }, label = { Text("陪护和探视要求") }, minLines = 3, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(profile.providedItemsNote, { profile = profile.copy(providedItemsNote = it) }, label = { Text("医院提供的用品") }, minLines = 3, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(profile.restrictedItemsNote, { profile = profile.copy(restrictedItemsNote = it) }, label = { Text("医院不允许携带的用品") }, minLines = 3, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(profile.requiredDocumentsNote, { profile = profile.copy(requiredDocumentsNote = it) }, label = { Text("需要携带的证件") }, minLines = 3, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(profile.generalNote, { profile = profile.copy(generalNote = it) }, label = { Text("其他备注") }, minLines = 3, modifier = Modifier.fillMaxWidth())
        Button(
            onClick = { report(repository.saveHospital(profile), "医院档案已保存。") },
            modifier = Modifier.fillMaxWidth(),
        ) { Text("保存医院档案") }
        Spacer(Modifier.height(12.dp))
    }
}

@Composable
private fun FamilyScreen(
    snapshot: AppSnapshot,
    padding: PaddingValues,
    repository: DadKitRepository,
    report: (DataActionResult, String) -> Unit,
) {
    var familyName by remember(snapshot.revision) { mutableStateOf(snapshot.familyName) }
    var showAdd by remember { mutableStateOf(false) }
    var deleting by remember { mutableStateOf<FamilyMember?>(null) }
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(padding),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            OutlinedTextField(
                familyName,
                { familyName = it },
                label = { Text("家庭名称") },
                modifier = Modifier.fillMaxWidth(),
                trailingIcon = {
                    IconButton(onClick = { report(repository.setFamilyName(familyName), "家庭名称已保存。") }) {
                        Icon(Icons.Default.CheckCircle, contentDescription = "保存家庭名称")
                    }
                },
            )
        }
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text("家庭成员", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                TextButton(onClick = { showAdd = true }) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Text("添加")
                }
            }
        }
        item {
            Text("这台设备的记录人", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text("之后新增的照护记录会显示是谁记的。", color = MaterialTheme.colorScheme.onSurfaceVariant)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                item {
                    FilterChip(
                        selected = snapshot.recordedByMemberId.isBlank(),
                        onClick = { report(repository.setRecordedByMemberId(null), "已设为不指定记录人。") },
                        label = { Text("不指定") },
                    )
                }
                items(snapshot.familyMembers, key = { it.id }) { member ->
                    FilterChip(
                        selected = snapshot.recordedByMemberId == member.id,
                        onClick = { report(repository.setRecordedByMemberId(member.id), "记录人已设为${member.displayName}。") },
                        label = { Text(member.displayName) },
                    )
                }
            }
        }
        if (snapshot.familyMembers.isEmpty()) {
            item { EmptyCard("还没有家庭成员。添加后，可以记录谁负责准备和照护。") }
        } else {
            items(snapshot.familyMembers, key = { it.id }) { member ->
                Card {
                    Row(Modifier.fillMaxWidth().padding(start = 16.dp, top = 10.dp, bottom = 10.dp, end = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Person, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(member.displayName, fontWeight = FontWeight.Medium)
                            if (member.relationship.isNotBlank()) Text(member.relationship, style = MaterialTheme.typography.bodySmall)
                        }
                        IconButton(onClick = { deleting = member }) { Icon(Icons.Default.Delete, contentDescription = "删除成员") }
                    }
                }
            }
        }
    }
    if (showAdd) {
        AddFamilyMemberDialog(onDismiss = { showAdd = false }) { name, relationship ->
            repository.addFamilyMember(name, relationship).also {
                if (it.ok) showAdd = false
                report(it, "家庭成员已添加。")
            }
        }
    }
    deleting?.let { member ->
        AlertDialog(
            onDismissRequest = { deleting = null },
            title = { Text("移除家庭成员？") },
            text = { Text("将移除“${member.displayName}”，历史照护记录不会删除。") },
            confirmButton = {
                TextButton(onClick = {
                    val result = repository.removeFamilyMember(member.id)
                    if (result.ok) deleting = null
                    report(result, "成员已移除。")
                }) { Text("移除") }
            },
            dismissButton = { TextButton(onClick = { deleting = null }) { Text("取消") } },
        )
    }
}

@Composable
private fun AddFamilyMemberDialog(onDismiss: () -> Unit, onSave: (String, String) -> Unit) {
    var name by remember { mutableStateOf("") }
    var relationship by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("添加家庭成员") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(name, { name = it }, label = { Text("称呼") }, singleLine = true)
                OutlinedTextField(relationship, { relationship = it }, label = { Text("关系，如爸爸、奶奶") }, singleLine = true)
            }
        },
        confirmButton = { Button(onClick = { onSave(name, relationship) }) { Text("添加") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("取消") } },
    )
}

@Composable
private fun SyncScreen(
    state: SyncState,
    padding: PaddingValues,
    client: NativeSyncClient,
    report: (SyncActionResult) -> Unit,
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var familyName by rememberSaveable { mutableStateOf("我的家庭") }
    var deviceName by rememberSaveable {
        mutableStateOf(listOf(Build.MANUFACTURER, Build.MODEL).filter(String::isNotBlank).joinToString(" ").ifBlank { "这台安卓手机" })
    }
    var invitation by rememberSaveable { mutableStateOf("") }
    var showSwitch by rememberSaveable { mutableStateOf(false) }
    var confirmReplace by remember { mutableStateOf(false) }
    var confirmDisconnect by remember { mutableStateOf(false) }

    Column(
        Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (state.connected) {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
                Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.CloudSync, contentDescription = null)
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text(state.familyName.ifBlank { "我的家庭" }, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                            Text(if (state.lastSyncAt.isBlank()) "已连接，等待首次同步" else "上次同步 ${formatTimestamp(state.lastSyncAt)}")
                        }
                    }
                    Button(
                        onClick = { scope.launch { report(client.syncNow()) } },
                        enabled = !state.syncing,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = null)
                        Spacer(Modifier.width(6.dp))
                        Text(if (state.syncing) "正在同步…" else "立即同步")
                    }
                }
            }
            if (state.message.isNotBlank()) {
                Card(colors = CardDefaults.cardColors(containerColor = if (state.isError) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.surfaceVariant)) {
                    Text(state.message, modifier = Modifier.padding(14.dp), color = if (state.isError) MaterialTheme.colorScheme.onErrorContainer else MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Text("邀请家人", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text("生成一条邀请，发给家人后即可加入同一个家庭。", color = MaterialTheme.colorScheme.onSurfaceVariant)
            Button(
                onClick = { scope.launch { report(client.createInvitation()) } },
                enabled = !state.syncing,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Icon(Icons.Default.Link, contentDescription = null)
                Spacer(Modifier.width(6.dp))
                Text("生成家庭邀请")
            }
            if (state.inviteLink.isNotBlank()) {
                OutlinedTextField(
                    value = state.inviteLink,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("家庭邀请") },
                    modifier = Modifier.fillMaxWidth(),
                    trailingIcon = {
                        IconButton(onClick = {
                            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                            clipboard.setPrimaryClip(ClipData.newPlainText("DadKit 家庭邀请", state.inviteLink))
                            report(SyncActionResult(true, "邀请已复制。"))
                        }) { Icon(Icons.Default.ContentCopy, contentDescription = "复制邀请") }
                    },
                )
            }
            OutlinedButton(
                onClick = { showSwitch = !showSwitch },
                enabled = !state.syncing,
                modifier = Modifier.fillMaxWidth(),
            ) { Text(if (showSwitch) "取消切换家庭" else "切换到另一个家庭") }
            if (showSwitch) {
                OutlinedTextField(
                    invitation,
                    { invitation = it },
                    label = { Text("新家庭的邀请") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2,
                )
                Button(
                    onClick = { confirmReplace = true },
                    enabled = invitation.isNotBlank() && !state.syncing,
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("检查并切换家庭") }
            }
            HorizontalDivider(Modifier.padding(vertical = 8.dp))
            OutlinedButton(onClick = { confirmDisconnect = true }, modifier = Modifier.fillMaxWidth()) {
                Text("停止在这台设备上同步")
            }
        } else {
            Text("让安卓 App 和 iPhone 上安装的 DadKit 保持一致。", color = MaterialTheme.colorScheme.onSurfaceVariant)
            OutlinedTextField(deviceName, { deviceName = it }, label = { Text("这台设备的名称") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            Card {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("创建家庭", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    Text("第一台设备从这里开始。", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    OutlinedTextField(familyName, { familyName = it }, label = { Text("家庭名称") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    Button(
                        onClick = { scope.launch { report(client.createFamily(familyName, deviceName)) } },
                        enabled = !state.syncing,
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text(if (state.syncing) "正在连接…" else "创建并开始同步") }
                }
            }
            Card {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("加入家庭", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    Text("粘贴家人发来的完整邀请。", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    OutlinedTextField(invitation, { invitation = it }, label = { Text("家庭邀请") }, modifier = Modifier.fillMaxWidth(), minLines = 2)
                    OutlinedButton(
                        onClick = { scope.launch { report(client.joinFamily(invitation, deviceName, replaceExisting = false)) } },
                        enabled = !state.syncing,
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text("加入并开始同步") }
                }
            }
            if (state.message.isNotBlank()) {
                Card(colors = CardDefaults.cardColors(containerColor = if (state.isError) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.surfaceVariant)) {
                    Text(state.message, modifier = Modifier.padding(14.dp))
                }
            }
        }
    }

    if (confirmReplace) {
        AlertDialog(
            onDismissRequest = { confirmReplace = false },
            title = { Text("切换到另一个家庭？") },
            text = { Text("本机数据会先与新家庭合并。原家庭中的数据不会被删除。") },
            confirmButton = {
                TextButton(onClick = {
                    confirmReplace = false
                    scope.launch { report(client.joinFamily(invitation, deviceName, replaceExisting = true)) }
                }) { Text("确认切换") }
            },
            dismissButton = { TextButton(onClick = { confirmReplace = false }) { Text("取消") } },
        )
    }
    if (confirmDisconnect) {
        AlertDialog(
            onDismissRequest = { confirmDisconnect = false },
            title = { Text("停止家庭同步？") },
            text = { Text("本机清单和照护记录会保留，之后的修改不再与家人同步。") },
            confirmButton = {
                TextButton(onClick = {
                    confirmDisconnect = false
                    scope.launch { report(client.disconnectFromFamily()) }
                }) { Text("停止同步") }
            },
            dismissButton = { TextButton(onClick = { confirmDisconnect = false }) { Text("取消") } },
        )
    }
}

@Composable
private fun BackupScreen(padding: PaddingValues, onSave: () -> Unit, onRestore: () -> Unit) {
    var confirmRestore by remember { mutableStateOf(false) }
    Column(
        Modifier.fillMaxSize().padding(padding).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text("备份文件包含清单、宝宝照护、医院档案和家庭成员。请妥善保管。", color = MaterialTheme.colorScheme.onSurfaceVariant)
        Card {
            Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Icon(Icons.Default.Backup, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(34.dp))
                Text("保存家庭备份", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text("选择手机中的保存位置，需要时可以恢复。")
                Button(onClick = onSave, modifier = Modifier.fillMaxWidth()) { Text("保存备份文件") }
            }
        }
        Card {
            Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Icon(Icons.Default.Restore, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(34.dp))
                Text("从备份恢复", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text("恢复会用备份中的家庭数据替换这台设备当前的数据。")
                OutlinedButton(onClick = { confirmRestore = true }, modifier = Modifier.fillMaxWidth()) { Text("选择备份文件") }
            }
        }
    }
    if (confirmRestore) {
        AlertDialog(
            onDismissRequest = { confirmRestore = false },
            title = { Text("从备份恢复？") },
            text = { Text("建议先保存一份当前数据。确认后请选择 DadKit 备份文件。") },
            confirmButton = {
                TextButton(onClick = {
                    confirmRestore = false
                    onRestore()
                }) { Text("继续") }
            },
            dismissButton = { TextButton(onClick = { confirmRestore = false }) { Text("取消") } },
        )
    }
}

@Composable
private fun EmptyCard(message: String) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Text(message, modifier = Modifier.fillMaxWidth().padding(18.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

private fun formatTimestamp(value: String): String {
    if (value.isBlank()) return "尚未同步"
    return runCatching {
        Instant.parse(value).atZone(ZoneId.systemDefault()).format(DateTimeFormatter.ofPattern("M月d日 HH:mm"))
    }.getOrDefault(value)
}
