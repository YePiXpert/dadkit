package com.dadkit.mobile.sync

import android.annotation.SuppressLint
import android.content.Context
import com.dadkit.mobile.BuildConfig
import com.dadkit.mobile.data.DadKitRepository
import com.dadkit.mobile.data.SyncActionResult
import com.dadkit.mobile.data.SyncState
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLDecoder
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.time.Instant

@SuppressLint("UseKtx")
class NativeSyncClient(
    context: Context,
    private val repository: DadKitRepository,
    private val clock: () -> Long = System::currentTimeMillis,
) {
    private val preferences = context.applicationContext
        .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
    private val baseUrl = BuildConfig.SYNC_BASE_URL.trimEnd('/')
    private val mutex = Mutex()
    private val mutableState = MutableStateFlow(loadState())

    val state: StateFlow<SyncState> = mutableState.asStateFlow()

    suspend fun createFamily(familyName: String, deviceName: String): SyncActionResult =
        mutex.withLock {
            val cleanFamily = familyName.trim()
            val cleanDevice = deviceName.trim()
            if (cleanFamily.isBlank()) return@withLock SyncActionResult(false, "请填写家庭名称。")
            if (cleanDevice.isBlank()) return@withLock SyncActionResult(false, "请填写这台设备的名称。")
            setBusy()
            try {
                val result = request(
                    path = "/api/sync/v2/spaces",
                    method = "POST",
                    body = JSONObject().put("displayName", cleanFamily).put("deviceName", cleanDevice),
                )
                val token = sessionToken(result.cookies)
                    ?: throw SyncRequestException("家庭已创建，但设备连接失败，请重试。", 502)
                val displayName = result.body.optJSONObject("space")?.optString("displayName")
                    ?.ifBlank { cleanFamily } ?: cleanFamily
                if (!saveSession(token, displayName, cleanDevice)) {
                    throw SyncRequestException("无法在设备上保存同步设置。", 0)
                }
                mutableState.value = SyncState(connected = true, familyName = displayName, syncing = true)
                syncLocked(token, displayName)
            } catch (error: Throwable) {
                fail(error, connected = currentToken().isNotBlank(), clearExpiredSession = false)
            }
        }

    suspend fun joinFamily(
        invitation: String,
        deviceName: String,
        replaceExisting: Boolean,
    ): SyncActionResult = mutex.withLock {
        val existing = currentToken()
        if (existing.isNotBlank() && !replaceExisting) {
            return@withLock SyncActionResult(false, "这台设备已连接一个家庭，请先确认是否切换。")
        }
        val inviteToken = parseInviteToken(invitation)
        if (inviteToken.isBlank()) return@withLock SyncActionResult(false, "请粘贴完整的家庭邀请。")
        val cleanDevice = deviceName.trim()
        if (cleanDevice.isBlank()) return@withLock SyncActionResult(false, "请填写这台设备的名称。")
        setBusy()
        try {
            val result = request(
                path = "/api/sync/v2/join",
                method = "POST",
                body = JSONObject().put("inviteToken", inviteToken).put("deviceName", cleanDevice),
                token = existing.takeIf(String::isNotBlank),
            )
            val token = sessionToken(result.cookies)
                ?: throw SyncRequestException("已加入家庭，但设备连接失败，请重试。", 502)
            val displayName = result.body.optJSONObject("space")?.optString("displayName")
                ?.ifBlank { "我的家庭" } ?: "我的家庭"
            if (!saveSession(token, displayName, cleanDevice)) {
                throw SyncRequestException("无法在设备上保存同步设置。", 0)
            }
            mutableState.value = SyncState(connected = true, familyName = displayName, syncing = true)
            syncLocked(token, displayName)
        } catch (error: Throwable) {
            fail(error, connected = currentToken().isNotBlank(), clearExpiredSession = false)
        }
    }

    suspend fun syncNow(): SyncActionResult = mutex.withLock {
        val token = currentToken()
        if (token.isBlank()) return@withLock SyncActionResult(false, "请先加入家庭同步。")
        setBusy()
        syncLocked(token, preferences.getString(FAMILY_NAME_KEY, "").orEmpty())
    }

    suspend fun createInvitation(): SyncActionResult = mutex.withLock {
        val token = currentToken()
        if (token.isBlank()) return@withLock SyncActionResult(false, "请先加入家庭同步。")
        setBusy()
        try {
            val response = request(
                path = "/api/sync/v2/invites",
                method = "POST",
                body = JSONObject().put("ttlMinutes", 1440),
                token = token,
            )
            val invite = response.body.optJSONObject("invite")?.optString("token").orEmpty()
            if (invite.isBlank()) throw SyncRequestException("邀请生成失败，请重试。", 502)
            val link = "$baseUrl/join#invite=${URLEncoder.encode(invite, StandardCharsets.UTF_8.name())}"
            mutableState.value = mutableState.value.copy(
                syncing = false,
                message = "邀请已生成，24 小时内有效。",
                isError = false,
                inviteLink = link,
            )
            SyncActionResult(true, "邀请已生成。", link)
        } catch (error: Throwable) {
            fail(error, connected = true)
        }
    }

    suspend fun disconnectFromFamily(): SyncActionResult = mutex.withLock {
        val token = currentToken()
        val leaveFailure = if (token.isBlank()) {
            null
        } else {
            runCatching {
                request(path = "/api/sync/leave", method = "POST", token = token)
            }.exceptionOrNull()
        }
        val saved = preferences.edit()
            .remove(TOKEN_KEY)
            .remove(FAMILY_NAME_KEY)
            .remove(DEVICE_NAME_KEY)
            .remove(LAST_SYNC_KEY)
            .commit()
        if (!saved) return@withLock SyncActionResult(false, "无法更新设备设置，请重试。")
        val message = if (leaveFailure == null) {
            "这台设备已停止家庭同步。"
        } else {
            "这台设备已停止家庭同步；服务器暂时未确认退出，可稍后在设备列表中检查。"
        }
        mutableState.value = SyncState(message = message, isError = leaveFailure != null)
        SyncActionResult(true, message)
    }

    private suspend fun syncLocked(token: String, familyName: String): SyncActionResult =
        withContext(Dispatchers.IO) {
            try {
                val pulled = request(path = "/api/sync/pull", method = "GET", token = token)
                updateServerClockOffset(pulled.headers)
                val remote = pulled.body.optJSONObject("data")
                    ?: throw SyncRequestException("家庭数据暂时无法读取，请稍后重试。", 502)
                val (saved, merged) = repository.mergeRemoteDocument(remote, JsonDocumentMerger::merge)
                if (!saved.ok || merged == null) {
                    throw SyncRequestException(saved.message.ifBlank { "同步结果无法保存。" }, 0)
                }
                val pushed = request(
                    path = "/api/sync/push",
                    method = "POST",
                    body = JSONObject().put("data", merged),
                    token = token,
                )
                pushed.body.optJSONObject("data")?.let { confirmed ->
                    val (confirmedSaved, _) = repository.mergeRemoteDocument(confirmed, JsonDocumentMerger::merge)
                    if (!confirmedSaved.ok) {
                        throw SyncRequestException(confirmedSaved.message, 0)
                    }
                }
                val lastSyncAt = Instant.now().toString()
                preferences.edit().putString(LAST_SYNC_KEY, lastSyncAt).apply()
                mutableState.value = SyncState(
                    connected = true,
                    familyName = familyName,
                    syncing = false,
                    lastSyncAt = lastSyncAt,
                    message = "家庭数据已同步。",
                    isError = false,
                )
                SyncActionResult(true, "家庭数据已同步。")
            } catch (error: Throwable) {
                fail(error, connected = true)
            }
        }

    private suspend fun request(
        path: String,
        method: String,
        body: JSONObject? = null,
        token: String? = null,
    ): HttpResult = withContext(Dispatchers.IO) {
        val connection = (URL("$baseUrl$path").openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = REQUEST_TIMEOUT_MS
            readTimeout = REQUEST_TIMEOUT_MS
            useCaches = false
            setRequestProperty("Accept", "application/json")
            setRequestProperty("X-DadKit-Data-Version", INTERNAL_DATA_VERSION)
            setRequestProperty("X-DadKit-Sync-Protocol", SYNC_PROTOCOL)
            setRequestProperty("User-Agent", "DadKitAndroid/${BuildConfig.VERSION_CODE}")
            if (method != "GET") setRequestProperty("Origin", baseUrl)
            if (!token.isNullOrBlank()) setRequestProperty("Authorization", "Bearer $token")
        }
        try {
            if (body != null) {
                val bytes = body.toString().toByteArray(StandardCharsets.UTF_8)
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                connection.setFixedLengthStreamingMode(bytes.size)
                connection.outputStream.use { it.write(bytes) }
            }
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader(StandardCharsets.UTF_8)?.use { it.readText() }.orEmpty()
            val response = runCatching { JSONObject(text.ifBlank { "{}" }) }.getOrElse { JSONObject() }
            if (status !in 200..299) {
                val serverMessage = response.optString("error")
                val message = when (status) {
                    401 -> serverMessage.ifBlank { "家庭连接已失效，请重新加入。" }
                    429 -> "操作太频繁，请稍后再试。"
                    in 500..599 -> "家庭同步服务暂时不可用，请稍后重试。"
                    else -> serverMessage.takeIf { it.isNotBlank() && !it.contains("版本") && !it.contains("格式") }
                        ?: "家庭同步请求失败，请检查后重试。"
                }
                throw SyncRequestException(message, status)
            }
            val headers = connection.headerFields.entries
                .mapNotNull { (key, values) -> key?.let { it to values.orEmpty() } }
                .toMap()
            val cookies = headers.entries
                .filter { it.key?.equals("Set-Cookie", ignoreCase = true) == true }
                .flatMap { it.value.orEmpty() }
            return@withContext HttpResult(response, cookies, headers)
        } catch (error: SyncRequestException) {
            throw error
        } catch (error: IOException) {
            throw SyncRequestException("网络连接失败，请检查网络后重试。", 0)
        } finally {
            connection.disconnect()
        }
    }

    private fun sessionToken(cookies: List<String>): String? {
        val raw = cookies.asSequence()
            .flatMap { it.split(';').asSequence() }
            .map(String::trim)
            .firstOrNull { it.startsWith("dadkit_sync_session=") }
            ?.substringAfter('=')
            ?.takeIf(String::isNotBlank)
            ?: return null
        return runCatching { URLDecoder.decode(raw, StandardCharsets.UTF_8.name()) }.getOrNull()
    }

    private fun parseInviteToken(value: String): String {
        val clean = value.trim()
        val encoded = when {
            clean.contains("#invite=") -> clean.substringAfter("#invite=").substringBefore('&')
            clean.contains("?invite=") -> clean.substringAfter("?invite=").substringBefore('&')
            else -> clean
        }
        return runCatching { URLDecoder.decode(encoded, StandardCharsets.UTF_8.name()) }
            .getOrDefault(encoded)
            .trim()
    }

    private fun saveSession(token: String, familyName: String, deviceName: String): Boolean =
        preferences.edit()
            .putString(TOKEN_KEY, token)
            .putString(FAMILY_NAME_KEY, familyName)
            .putString(DEVICE_NAME_KEY, deviceName)
            .commit()

    private fun currentToken(): String = preferences.getString(TOKEN_KEY, "").orEmpty()

    private fun updateServerClockOffset(headers: Map<String, List<String>>) {
        val serverTime = headers.entries
            .firstOrNull { it.key.equals("X-DadKit-Server-Time", ignoreCase = true) }
            ?.value
            ?.firstOrNull()
        val offset = calculateServerClockOffset(serverTime, clock()) ?: return
        preferences.edit().putLong(DadKitRepository.SERVER_CLOCK_OFFSET_KEY, offset).apply()
    }

    private fun loadState(): SyncState {
        val token = currentToken()
        return SyncState(
            connected = token.isNotBlank(),
            familyName = preferences.getString(FAMILY_NAME_KEY, "").orEmpty(),
            lastSyncAt = preferences.getString(LAST_SYNC_KEY, "").orEmpty(),
        )
    }

    private fun setBusy() {
        mutableState.value = mutableState.value.copy(syncing = true, message = "", isError = false)
    }

    private fun fail(
        error: Throwable,
        connected: Boolean,
        clearExpiredSession: Boolean = true,
    ): SyncActionResult {
        if (error is CancellationException) throw error
        val message = if (error is SyncRequestException) error.message.orEmpty()
        else "家庭同步失败，请稍后重试。"
        val sessionExpired = clearExpiredSession && error is SyncRequestException && error.status == 401 && connected
        if (sessionExpired) {
            preferences.edit().remove(TOKEN_KEY).apply()
        }
        mutableState.value = mutableState.value.copy(
            connected = connected && !sessionExpired,
            syncing = false,
            message = message,
            isError = true,
        )
        return SyncActionResult(false, message)
    }

    private data class HttpResult(
        val body: JSONObject,
        val cookies: List<String>,
        val headers: Map<String, List<String>>,
    )
    private class SyncRequestException(message: String, val status: Int) : Exception(message)

    companion object {
        private const val PREFERENCES_NAME = "dadkit_native_sync"
        private const val TOKEN_KEY = "session_token"
        private const val FAMILY_NAME_KEY = "family_name"
        private const val DEVICE_NAME_KEY = "device_name"
        private const val LAST_SYNC_KEY = "last_sync_at"
        private const val REQUEST_TIMEOUT_MS = 15_000
        private const val INTERNAL_DATA_VERSION = "9"
        private const val SYNC_PROTOCOL = "2"
    }
}

internal fun calculateServerClockOffset(serverTime: String?, localNow: Long): Long? {
    val value = serverTime ?: return null
    return runCatching { Instant.parse(value).toEpochMilli() - localNow }.getOrNull()
}
