package com.dadkit.mobile.sync

import com.dadkit.mobile.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets

data class AppUpdateInfo(
    val versionCode: Int,
    val versionName: String,
    val notes: String,
    val downloadUrl: String,
)

class NativeUpdateClient(
    private val baseUrl: String = BuildConfig.SYNC_BASE_URL.trimEnd('/'),
) {
    suspend fun checkForUpdate(): AppUpdateInfo? = withContext(Dispatchers.IO) {
        runCatching {
            val connection = (URL("$baseUrl/api/app-version").openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = REQUEST_TIMEOUT_MS
                readTimeout = REQUEST_TIMEOUT_MS
                useCaches = false
                setRequestProperty("Accept", "application/json")
            }
            try {
                if (connection.responseCode !in 200..299) return@runCatching null
                val text = connection.inputStream.bufferedReader(StandardCharsets.UTF_8).use { it.readText() }
                val manifest = JSONObject(text)
                val versionCode = manifest.optInt("versionCode")
                if (versionCode <= BuildConfig.VERSION_CODE) return@runCatching null
                val relativeUrl = manifest.optString("url")
                    .ifBlank { "/api/app-version/apk?versionCode=$versionCode" }
                AppUpdateInfo(
                    versionCode = versionCode,
                    versionName = manifest.optString("versionName").ifBlank { versionCode.toString() },
                    notes = manifest.optString("notes"),
                    downloadUrl = URL(URL("$baseUrl/"), relativeUrl).toString(),
                )
            } finally {
                connection.disconnect()
            }
        }.getOrNull()
    }

    companion object {
        private const val REQUEST_TIMEOUT_MS = 10_000
    }
}
