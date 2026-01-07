# Google Play Store Upload Guide for Pianew Tiles

## Prerequisites

Before uploading Pianew Tiles to Google Play Store, ensure you have:

1. **Google Play Developer Account** ($25 one-time fee)
   - Visit: https://play.google.com/console
   - Create account with Google account
   - Accept terms and pay registration fee

2. **Signed Release APK/AAB**
   - Generated keystore file (`.keystore`)
   - Keystore password and key alias
   - Release build compiled with Gradle

3. **App Assets**
   - App icon (512x512 PNG)
   - Feature graphic (1024x500 PNG)
   - Screenshots (minimum 5, maximum 8)
   - Privacy Policy (URL or text)
   - Terms of Service (URL or text)

4. **App Information**
   - App name: "Pianew Tiles"
   - Short description (80 characters)
   - Full description (4000 characters)
   - Category: Games > Casual
   - Content rating: Everyone (PEGI 3)

## Step-by-Step Upload Process

### Step 1: Prepare Your Release Build

#### Generate Keystore (First Time Only)

```bash
# Navigate to project root
cd pianew-tiles

# Generate keystore file
keytool -genkey -v -keystore pianew-tiles.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias pianew-tiles-key

# You will be prompted for:
# - Keystore password (remember this!)
# - Key password (can be same as keystore)
# - Your name, organization, location, etc.
```

#### Configure Gradle for Signing

Create or edit `android/gradle.properties`:

```properties
KEYSTORE_FILE=../pianew-tiles.keystore
KEYSTORE_PASSWORD=your_keystore_password
KEY_ALIAS=pianew-tiles-key
KEY_PASSWORD=your_key_password
```

#### Build Release AAB

```bash
# Navigate to Android directory
cd android

# Build Android App Bundle (AAB) for Play Store
./gradlew bundleRelease

# Output location: android/app/build/outputs/bundle/release/app-release.aab
```

If you need an APK for testing:

```bash
# Build release APK
./gradlew assembleRelease

# Output location: android/app/build/outputs/apk/release/app-release.apk
```

### Step 2: Create App Listing in Play Console

1. **Open Google Play Console**
   - Go to: https://play.google.com/console
   - Sign in with your developer account

2. **Create New App**
   - Click "Create app" button
   - Fill in app details:
     - **App name:** Pianew Tiles
     - **Default language:** English
     - **App or game:** Game
     - **Free or paid:** Free
     - **Category:** Games > Casual

3. **Accept Declaration**
   - Accept Google Play policies
   - Click "Create app"

### Step 3: Fill in App Details

#### Dashboard Section

1. **App Details**
   - **App name:** Pianew Tiles
   - **Short description:** "Tap the rhythm! A musical piano tiles game with addictive gameplay."
   - **Full description:** (Use content from `docs/store-descriptions.md`)

2. **App Category**
   - Category: Games > Casual
   - Content rating: Everyone (PEGI 3)

3. **Contact Details**
   - Email: support@pianew.app
   - Phone: (optional)
   - Website: (optional)

#### Store Listing Section

1. **Graphics & Images**
   - **App icon** (512x512 PNG)
     - Upload: `client/public/images/app-icon-512.png`
   
   - **Feature graphic** (1024x500 PNG)
     - Upload: `client/public/images/google-play-banner-1024x500.png`
   
   - **Screenshots** (minimum 5, maximum 8)
     - Upload all images from `client/public/images/screenshot-*.png`
     - Recommended: 1080x1920 or 1440x2560 resolution

2. **Description**
   - **Short description (80 chars):**
     ```
     Tap the rhythm! A musical piano tiles game with addictive gameplay.
     ```
   
   - **Full description (4000 chars):**
     - Copy from `docs/store-descriptions.md`
     - Include features, gameplay, and call-to-action

3. **Category & Content Rating**
   - **Category:** Games > Casual
   - **Content rating:** Everyone (PEGI 3)
   - **Requires rating questionnaire**

#### Content Rating Questionnaire

1. Click "Set up questionnaire"
2. Answer questions about app content:
   - Violence: None
   - Sexual content: None
   - Profanity: None
   - Alcohol/Tobacco: None
   - Gambling: None
   - Other: None
3. Submit questionnaire
4. Receive rating (typically Everyone/PEGI 3)

#### Privacy Policy & Terms

1. **Privacy Policy**
   - Option A: Upload file from `docs/privacy-policy.md`
   - Option B: Host on website and provide URL
   - Recommended: Host on website for easy updates

2. **Terms of Service**
   - Option A: Upload file from `docs/terms-of-service.md`
   - Option B: Host on website and provide URL

### Step 4: Upload Build

#### Navigate to Release Section

1. In Play Console, go to **Release** section
2. Click **Production** tab
3. Click **Create new release** button

#### Upload AAB File

1. Click **Browse files** under "Android App Bundle"
2. Select: `android/app/build/outputs/bundle/release/app-release.aab`
3. Click **Open** to upload

#### Review Release Details

1. **Version code:** Auto-assigned (e.g., 1)
2. **Version name:** 1.0.0
3. **Release notes:** 
   ```
   Initial release of Pianew Tiles!
   
   Features:
   - 4-column rhythm gameplay
   - Real-time audio synthesis
   - Star rating system
   - Detailed statistics
   - Offline gameplay
   - Haptic feedback
   ```

### Step 5: Pre-Launch Checks

Before submitting for review:

- [ ] App icon is 512x512 PNG
- [ ] Feature graphic is 1024x500 PNG
- [ ] Minimum 5 screenshots uploaded
- [ ] Short description is under 80 characters
- [ ] Full description is under 4000 characters
- [ ] Privacy policy is complete and accessible
- [ ] Terms of service are provided
- [ ] Content rating questionnaire completed
- [ ] Category is set to Games > Casual
- [ ] Target audience is Everyone
- [ ] AAB file is uploaded and valid
- [ ] Version name and code are correct
- [ ] Release notes are provided

### Step 6: Submit for Review

1. Review all information one final time
2. Click **Review release** button
3. Verify all details are correct
4. Click **Start rollout to Production** button
5. Confirm submission

**Note:** Google Play review typically takes 2-4 hours, but can take up to 24 hours.

### Step 7: Monitor Review Status

1. Go to **Release** > **Production**
2. Check release status:
   - **Pending review:** App is being reviewed
   - **Approved:** App is approved and will be published
   - **Rejected:** Review failed (check feedback)

3. If rejected:
   - Read rejection reason carefully
   - Fix issues
   - Create new release and resubmit

## Post-Launch Checklist

After your app is live on Google Play Store:

- [ ] Verify app appears in Play Store search
- [ ] Test app installation from Play Store
- [ ] Monitor crash reports in Play Console
- [ ] Respond to user reviews
- [ ] Track download and install metrics
- [ ] Monitor user ratings
- [ ] Set up analytics (optional)
- [ ] Plan updates and improvements

## Troubleshooting

### Common Upload Issues

#### "Invalid APK/AAB"
- **Cause:** Signing issues or corrupted file
- **Solution:** Rebuild with correct keystore credentials

#### "Minimum API Level"
- **Cause:** App targets API < 26
- **Solution:** Ensure `minSdkVersion = 26` in `build.gradle`

#### "Duplicate Package Name"
- **Cause:** Package ID already exists
- **Solution:** Change package ID in `capacitor.config.ts` to unique value

#### "Permissions Not Declared"
- **Cause:** Using features without permissions
- **Solution:** Declare all permissions in `AndroidManifest.xml`

### Common Review Rejections

#### "Misleading Description"
- **Solution:** Ensure description accurately reflects app features

#### "Crashes on Startup"
- **Solution:** Test on multiple devices, check crash logs in Play Console

#### "Violates Intellectual Property"
- **Solution:** Ensure all assets are original or properly licensed

#### "Insufficient Content"
- **Solution:** Add more features or content before resubmitting

## Updating Your App

To release updates:

1. Increment version code and name in `capacitor.config.ts`
2. Rebuild AAB: `cd android && ./gradlew bundleRelease`
3. Upload new AAB to Play Console
4. Add release notes describing changes
5. Submit for review

## Resources

- **Google Play Console:** https://play.google.com/console
- **Google Play Policies:** https://play.google.com/about/developer-content-policy/
- **Android App Bundle Guide:** https://developer.android.com/guide/app-bundle
- **Play Console Help:** https://support.google.com/googleplay/android-developer

## Support

For issues during upload:

- Check Google Play Console help documentation
- Review app rejection feedback carefully
- Contact Google Play support if needed
- Email: support@pianew.app

---

**Pianew Tiles Upload Guide**  
*Last Updated: January 2026*
