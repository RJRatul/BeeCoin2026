'use client';

import { useEffect } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export const usePushNotifications = (token: string | null) => {
  useEffect(() => {
    if (!token || typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const setup = async () => {
      try {
        // Register service worker
        const reg = await navigator.serviceWorker.register('/sw.js');

        // Ask for notification permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // Fetch VAPID public key
        const { data } = await axios.get(`${API}/push/vapid-public-key`);
        if (!data.publicKey) return;

        const applicationServerKey = urlBase64ToUint8Array(data.publicKey).buffer as ArrayBuffer;

        // Subscribe
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });

        // Send subscription to backend
        await axios.post(`${API}/push/subscribe`, subscription.toJSON(), {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        // Push setup is optional — fail silently
        console.warn('[Push] Setup skipped:', err);
      }
    };

    setup();
  }, [token]);
};
