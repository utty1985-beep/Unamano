plugins { id("com.android.application") }

android {
    namespace = "com.cacciatraccia.italia"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.cacciatraccia.italia"
        minSdk = 24
        targetSdk = 35
        versionCode = 6201
        versionName = "6.2.1"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
