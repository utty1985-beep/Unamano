plugins { id("com.android.application") }

android {
    namespace = "com.cacciatraccia.italia"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.cacciatraccia.italia"
        minSdk = 24
        targetSdk = 35
        versionCode = 6111
        versionName = "6.1.11"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
