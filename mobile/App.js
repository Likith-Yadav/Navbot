import { StatusBar } from "expo-status-bar";
import { SafeAreaView, View, Text } from "react-native";
import WebView from "react-native-webview";
import { useEffect, useRef, useState, useCallback } from "react";
import * as Location from "expo-location";

// Point this to your deployed Next.js site or local dev server.
const LOCKED_URL = "https://navbot-gamma.vercel.app";
const ALLOWED_HOSTS = ["navbot-gamma.vercel.app"];

function postLocation(webviewRef, coords) {
  if (!webviewRef.current || !coords) return;
  const payload = {
    type: "GPS_UPDATE",
    coords: {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy ?? null,
      timestamp: Date.now(),
    },
  };
  webviewRef.current.postMessage(JSON.stringify(payload));
}

export default function App() {
  const webviewRef = useRef(null);
  const [webKey, setWebKey] = useState(0);

  useEffect(() => {
    let locationSub = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return;
      }

      try {
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        postLocation(webviewRef, current.coords);

        locationSub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 1,
          },
          (update) => postLocation(webviewRef, update.coords),
        );
      } catch (e) {
        // swallow errors; app UI will fall back to in-browser geolocation if available
      }
    })();

    return () => {
      if (locationSub) locationSub.remove();
    };
  }, []);

  const isAllowedUrl = useCallback((url) => {
    try {
      const host = new URL(url).hostname;
      return ALLOWED_HOSTS.includes(host);
    } catch {
      return false;
    }
  }, []);

  const handleNavChange = useCallback(
    (event) => {
      if (!isAllowedUrl(event.url)) {
        setWebKey((k) => k + 1); // reload locked URL
      }
    },
    [isAllowedUrl],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar style="auto" />
      <WebView
        key={webKey}
        ref={webviewRef}
        source={{ uri: LOCKED_URL }}
        style={{ flex: 1 }}
        originWhitelist={[LOCKED_URL]}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        startInLoadingState
        // Needed for Android when hitting local HTTP during development.
        mixedContentMode="always"
        // Allow mic/camera prompts inside the webview (needed for speech input).
        mediaCapturePermissionGrantType="grant"
        // Allow GPS prompts inside the webview.
        geolocationEnabled
        // Helps avoid issues with certain redirects/cookies.
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={(req) => isAllowedUrl(req.url)}
        onNavigationStateChange={handleNavChange}
      />
    </SafeAreaView>
  );
}
