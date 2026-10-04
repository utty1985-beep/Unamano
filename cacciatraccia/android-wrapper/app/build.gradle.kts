plugins { id("com.android.application") }

android {
    namespace = "com.cacciatraccia.italia"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.cacciatraccia.italia"
        minSdk = 24
        targetSdk = 36
        versionCode = 6401
        versionName = "6.4.1"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("androidx.core:core:1.17.0")
    implementation("com.android.billingclient:billing:9.1.0")
}
