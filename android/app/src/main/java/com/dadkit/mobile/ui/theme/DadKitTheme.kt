package com.dadkit.mobile.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DadKitColors = lightColorScheme(
    primary = Color(0xFF9E493F),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFFFDAD5),
    onPrimaryContainer = Color(0xFF3F0502),
    secondary = Color(0xFF775651),
    secondaryContainer = Color(0xFFFFDAD5),
    background = Color(0xFFFCF8F3),
    onBackground = Color(0xFF211A18),
    surface = Color(0xFFFCF8F3),
    surfaceVariant = Color(0xFFF4DDD8),
    outline = Color(0xFF857370),
    error = Color(0xFFBA1A1A),
)

@Composable
fun DadKitTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DadKitColors,
        typography = Typography(),
        content = content,
    )
}
