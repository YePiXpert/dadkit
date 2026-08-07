package com.dadkit.mobile.sync

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class NativeSyncClockTest {
    @Test
    fun `calculates the server clock offset from the pull response header`() {
        assertEquals(3_600_000L, calculateServerClockOffset("1970-01-01T01:00:01Z", 1_000))
        assertNull(calculateServerClockOffset("not-a-time", 1_000))
        assertNull(calculateServerClockOffset(null, 1_000))
    }
}
