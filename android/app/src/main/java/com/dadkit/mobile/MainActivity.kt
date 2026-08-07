package com.dadkit.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.dadkit.mobile.data.DadKitRepository
import com.dadkit.mobile.sync.NativeSyncClient
import com.dadkit.mobile.sync.NativeUpdateClient
import com.dadkit.mobile.ui.DadKitApp
import com.dadkit.mobile.ui.theme.DadKitTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val repository = DadKitRepository(applicationContext)
        val syncClient = NativeSyncClient(applicationContext, repository)
        val updateClient = NativeUpdateClient()

        setContent {
            DadKitTheme {
                DadKitApp(
                    repository = repository,
                    syncClient = syncClient,
                    updateClient = updateClient,
                )
            }
        }
    }
}
