// import Geolocation from '@react-native-community/geolocation';
// import messaging from '@react-native-firebase/messaging';
// import { Picker } from '@react-native-picker/picker';
// import axios from 'axios';
// import { useEffect, useRef, useState } from 'react';
// import {
//   ActivityIndicator,
//   Button,
//   PermissionsAndroid,
//   Platform,
//   StyleSheet,
//   Text,
//   TextInput,
//   View,
//   Alert,
// } from 'react-native';
// import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

// const BACKEND_URL = 'http://192.168.1.3:8000';

// messaging().setBackgroundMessageHandler(async remoteMessage => {
//   console.log('Message handled in the background!', remoteMessage);
// });

// export default function App() {
//   // Auth state
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [jwt, setJwt] = useState(null);
//   const [user, setUser] = useState(null);

//   // Location and tracking state
//   const [userLocation, setUserLocation] = useState(null);
//   const [vehicleLocation, setVehicleLocation] = useState(null);
//   const [tracking, setTracking] = useState(false);
//   const [vehicles, setVehicles] = useState([]);
//   const [selectedVehicleId, setSelectedVehicleId] = useState(null);
//   const [loadingVehicles, setLoadingVehicles] = useState(true);
//   const [notified, setNotified] = useState(false);
//   const wsVehicleRef = useRef(null);
//   const wsUserRef = useRef(null);
//   const watchIdRef = useRef(null);

//   // 1. Request location permission (Android)
//   const requestLocationPermission = async () => {
//     if (Platform.OS === 'android') {
//       try {
//         const granted = await PermissionsAndroid.request(
//           PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
//           {
//             title: 'Location Permission',
//             message: 'This app needs access to your location.',
//             buttonNeutral: 'Ask Me Later',
//             buttonNegative: 'Cancel',
//             buttonPositive: 'OK',
//           }
//         );
//         return granted === PermissionsAndroid.RESULTS.GRANTED;
//       } catch (err) {
//         Alert.alert('Permission error', 'Failed to request location permission.');
//         return false;
//       }
//     }
//     return true;
//   };

//   // 2. Firebase Cloud Messaging setup: ask for notification permission
//   useEffect(() => {
//     const setupFCM = async () => {
//       try {
//         await messaging().requestPermission();
//         await messaging().registerDeviceForRemoteMessages();
//       } catch (e) {
//         console.log('FCM permission error:', e);
//       }
//     };
//     setupFCM();
//   }, []);

//   // 3. Listen for foreground FCM notifications (show notification)
//   useEffect(() => {
//     const unsubscribe = messaging().onMessage(async remoteMessage => {
//       console.log('FCM Message Data:', remoteMessage);
//       // Optionally show an alert
//       Alert.alert('New FCM Message', JSON.stringify(remoteMessage));
//     });
//     return unsubscribe;
//   }, []);

//   // 4. Listen for notification taps (background/quit)
//   useEffect(() => {
//     const unsubscribe = messaging().onNotificationOpenedApp(remoteMessage => {
//       // Handle notification tap when app is in background
//       console.log('Notification caused app to open from background:', remoteMessage);
//     });
//     messaging()
//       .getInitialNotification()
//       .then(remoteMessage => {
//         if (remoteMessage) {
//           console.log('Notification caused app to open from quit state:', remoteMessage);
//         }
//       });
//     return unsubscribe;
//   }, []);

//   // 5. Login handler (get FCM token and send to backend)
//   const handleLogin = async () => {
//     try {
//       const res = await axios.post(`${BACKEND_URL}/users/login`, {
//         email,
//         password,
//       });
//       setJwt(res.data.access_token);
//       setUser(res.data.user);

//       // Get and send FCM token to backend
//       const fcmToken = await messaging().getToken();
//       await axios.post(`${BACKEND_URL}/users/update-fcm-token`, {
//         user_id: res.data.user.id,
//         fcm_token: fcmToken,
//       });

//       // Get user location
//       let loc = res.data.user.location;
//       if (!loc || !loc.latitude || !loc.longitude) {
//         const hasPermission = await requestLocationPermission();
//         if (!hasPermission) {
//           Alert.alert('Permission denied', 'Location permission is required.');
//           return;
//         }
//         Geolocation.getCurrentPosition(
//           (position) => {
//             loc = {
//               latitude: position.coords.latitude,
//               longitude: position.coords.longitude,
//             };
//             setUserLocation(loc);

//             // Send user location to backend via WebSocket
//             const wsUser = new WebSocket(`${BACKEND_URL.replace('http', 'ws')}/ws/user-location`);
//             wsUserRef.current = wsUser;
//             wsUser.onopen = () => {
//               wsUser.send(
//                 JSON.stringify({
//                   user_id: res.data.user.id,
//                   location: loc,
//                 })
//               );
//             };
//           },
//           (error) => {
//             Alert.alert('Location error', error.message);
//           },
//           { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
//         );
//         return;
//       }
//       setUserLocation(loc);

//       // Send user location to backend via WebSocket
//       const wsUser = new WebSocket(`${BACKEND_URL.replace('http', 'ws')}/ws/user-location`);
//       wsUserRef.current = wsUser;
//       wsUser.onopen = () => {
//         wsUser.send(
//           JSON.stringify({
//             user_id: res.data.user.id,
//             location: loc,
//           })
//         );
//       };
//     } catch (e) {
//       Alert.alert('Login error', 'Failed to log in. Check your credentials and network.');
//     }
//   };

//   // 6. Real-time user location updates after login
//   useEffect(() => {
//     const startWatch = async () => {
//       if (jwt && user && wsUserRef.current) {
//         const hasPermission = await requestLocationPermission();
//         if (!hasPermission) {
//           Alert.alert('Permission denied', 'Location permission is required.');
//           return;
//         }
//         watchIdRef.current = Geolocation.watchPosition(
//           (position) => {
//             const coords = {
//               latitude: position.coords.latitude,
//               longitude: position.coords.longitude,
//             };
//             setUserLocation(coords);
//             try {
//               wsUserRef.current?.send(
//                 JSON.stringify({
//                   user_id: user.id,
//                   location: coords,
//                 })
//               );
//             } catch (err) {
//               console.log('WebSocket send error:', err);
//             }
//           },
//           (error) => {
//             console.log('Location watch error:', error);
//           },
//           { enableHighAccuracy: true, distanceFilter: 5, interval: 5000 }
//         );
//       }
//     };
//     startWatch();

//     return () => {
//       if (watchIdRef.current !== null) {
//         Geolocation.clearWatch(watchIdRef.current);
//         watchIdRef.current = null;
//       }
//     };
//   }, [jwt, user]);

//   // 7. Fetch all vehicles after login
//   useEffect(() => {
//     if (!jwt) return;
//     const fetchVehicles = async () => {
//       try {
//         setLoadingVehicles(true);
//         const res = await axios.get(`${BACKEND_URL}/vehicles/all`, {
//           headers: { Authorization: `Bearer ${jwt}` },
//         });
//         setVehicles(res.data);
//         if (res.data.length > 0) {
//           setSelectedVehicleId(res.data[0].id);
//         }
//       } catch (e) {
//         Alert.alert('Error', 'Failed to fetch vehicles.');
//       } finally {
//         setLoadingVehicles(false);
//       }
//     };
//     fetchVehicles();
//   }, [jwt]);

//   // 8. Start tracking vehicle (WebSocket for real-time updates)
//   const startTracking = async () => {
//     if (!selectedVehicleId) {
//       Alert.alert('Select a vehicle', 'Please select a vehicle to track.');
//       return;
//     }
//     try {
//       const res = await axios.get(`${BACKEND_URL}/vehicles/track/${selectedVehicleId.trim()}`, {
//         headers: { Authorization: `Bearer ${jwt}` },
//       });
//       setVehicleLocation({
//         latitude: res.data.location.latitude,
//         longitude: res.data.location.longitude,
//       });
//     } catch (e) {
//       Alert.alert('Error', 'Failed to get vehicle location.');
//       return;
//     }

//     // Connect to WebSocket for real-time vehicle updates (use /ws/track-vehicle)
//     if (wsVehicleRef.current) {
//       wsVehicleRef.current.close();
//     }
//     const ws = new WebSocket(`${BACKEND_URL.replace('http', 'ws')}/ws/track-vehicle`);
//     wsVehicleRef.current = ws;

//     ws.onopen = () => {
//       // Subscribe to the selected vehicle
//       ws.send(JSON.stringify({ vehicle_id: selectedVehicleId }));
//       setTracking(true);
//     };

//     ws.onmessage = async (e) => {
//       let msg;
//       try {
//         msg = JSON.parse(e.data);
//       } catch {
//         return;
//       }
//       if (!msg.location || msg.vehicle_id !== selectedVehicleId) return;

//       const newVehicleLocation = {
//         latitude: msg.location.latitude,
//         longitude: msg.location.longitude,
//       };
//       setVehicleLocation(newVehicleLocation);
//     };

//     ws.onerror = (err) => {
//       console.log('Vehicle WebSocket error:', err);
//     };

//     ws.onclose = () => {
//       setTracking(false);
//     };
//   };

//   // 9. Stop tracking
//   const stopTracking = () => {
//     if (wsVehicleRef.current) {
//       wsVehicleRef.current.close();
//       wsVehicleRef.current = null;
//     }
//     setTracking(false);
//     setVehicleLocation(null);
//     setNotified(false); // Reset notification state
//   };

//   // UI
//   if (!jwt) {
//     return (
//       <View style={styles.loginContainer}>
//         <Text style={styles.title}>RideAlert Login</Text>
//         <TextInput
//           style={styles.input}
//           placeholder="Email"
//           autoCapitalize="none"
//           value={email}
//           onChangeText={setEmail}
//         />
//         <TextInput
//           style={styles.input}
//           placeholder="Password"
//           secureTextEntry
//           value={password}
//           onChangeText={setPassword}
//         />
//         <Button title="Login" onPress={handleLogin} />
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <MapView
//         style={styles.map}
//         provider={PROVIDER_GOOGLE}
//         mapType="satellite"
//         region={
//           userLocation
//             ? {
//                 latitude: userLocation.latitude,
//                 longitude: userLocation.longitude,
//                 latitudeDelta: 0.01,
//                 longitudeDelta: 0.01,
//               }
//             : {
//                 latitude: 37.78825, // fallback to a default region
//                 longitude: -122.4324,
//                 latitudeDelta: 0.01,
//                 longitudeDelta: 0.01,
//               }
//         }
//         showsUserLocation={true}
//         showsMyLocationButton={true}
//         loadingEnabled={true}
//       >
//         {vehicleLocation && (
//           <Marker
//             coordinate={vehicleLocation}
//             title="Vehicle"
//             pinColor="blue"
//           />
//         )}
//         {userLocation && (
//           <Marker
//             coordinate={userLocation}
//             title="You"
//             pinColor="green"
//           />
//         )}
//       </MapView>
//       <View style={styles.buttonContainer}>
//         {loadingVehicles ? (
//           <ActivityIndicator size="large" color="#0000ff" />
//         ) : (
//           <>
//             <Text>Select a vehicle to track:</Text>
//             <Picker
//               selectedValue={selectedVehicleId}
//               style={styles.picker}
//               onValueChange={(itemValue) => setSelectedVehicleId(itemValue)}
//             >
//               {vehicles.map((vehicle) => (
//                 <Picker.Item
//                   key={vehicle.id}
//                   label={`${vehicle.route} (${vehicle.status})`}
//                   value={vehicle.id}
//                 />
//               ))}
//             </Picker>
//             <Button
//               title={tracking ? 'Stop Tracking' : 'Track Vehicle'}
//               onPress={tracking ? stopTracking : startTracking}
//             />
//             <Text style={{ marginTop: 10 }}>
//               {tracking
//                 ? 'Tracking vehicle in real-time...'
//                 : 'Press to start tracking.'}
//             </Text>
//           </>
//         )}
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   loginContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 24,
//     backgroundColor: '#fff',
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     marginBottom: 24,
//   },
//   input: {
//     width: '100%',
//     borderWidth: 1,
//     borderColor: '#ccc',
//     borderRadius: 8,
//     padding: 12,
//     marginBottom: 16,
//   },
//   map: {
//     flex: 1,
//     minHeight: 300,
//     width: '100%',
//   },
//   buttonContainer: {
//     position: 'absolute',
//     bottom: 40,
//     left: 0,
//     right: 0,
//     alignItems: 'center',
//     backgroundColor: 'rgba(255,255,255,0.9)',
//     padding: 10,
//     borderRadius: 10,
//   },
//   picker: {
//     height: 50,
//     width: 250,
//   },
// });

import Geolocation from '@react-native-community/geolocation';
import messaging from '@react-native-firebase/messaging';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const BACKEND_URL = 'http://192.168.1.3:8000';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);
});

// Haversine distance calculation
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Radius of Earth in meters
  const phi1 = lat1 * (Math.PI / 180);
  const phi2 = lat2 * (Math.PI / 180);
  const dphi = (lat2 - lat1) * (Math.PI / 180);
  const dlam = (lon2 - lon1) * (Math.PI / 180);

  const a = Math.sin(dphi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlam / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
};

export default function App() {
  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [jwt, setJwt] = useState(null);
  const [user, setUser] = useState(null);

  // Location and tracking state
  const [userLocation, setUserLocation] = useState(null);
  const [vehicleLocation, setVehicleLocation] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [notificationSent, setNotificationSent] = useState(false);
  const [lastNotificationTime, setLastNotificationTime] = useState(0);
  const wsVehicleRef = useRef(null);
  const wsUserRef = useRef(null);
  const watchIdRef = useRef(null);

  // Notification cooldown (5 minutes)
  const NOTIFICATION_COOLDOWN = 5 * 60 * 1000;

  // 1. Request location permission (Android)
  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        Alert.alert('Permission error', 'Failed to request location permission.');
        return false;
      }
    }
    return true;
  };

  // Check proximity and trigger notification
  const checkProximityAndNotify = async (userLoc, vehicleLoc, vehicleId) => {
    if (!userLoc || !vehicleLoc || !jwt || !user) return;

    const distance = calculateDistance(
      userLoc.latitude,
      userLoc.longitude,
      vehicleLoc.latitude,
      vehicleLoc.longitude
    );

    console.log(`Distance to vehicle: ${distance.toFixed(2)} meters`);

    // Check if vehicle is within 500 meters and notification hasn't been sent recently
    if (distance <= 500) {
      const now = Date.now();
      if (!notificationSent || (now - lastNotificationTime) > NOTIFICATION_COOLDOWN) {
        try {
          // Call backend to send FCM notification
          await axios.post(`${BACKEND_URL}/notifications/send-proximity`, {
            user_id: user.id,
            vehicle_id: vehicleId,
            distance: Math.round(distance)
          }, {
            headers: { Authorization: `Bearer ${jwt}` }
          });
          
          setNotificationSent(true);
          setLastNotificationTime(now);
          
          // Also show local alert for testing
          Alert.alert('PUV Nearby!', `A PUV is ${Math.round(distance)} meters away from you!`);
          
          console.log('Proximity notification sent successfully');
        } catch (error) {
          console.error('Failed to send proximity notification:', error);
          // Fallback to local alert
          Alert.alert('PUV Nearby!', `A PUV is ${Math.round(distance)} meters away from you!`);
        }
      }
    } else {
      // Reset notification state when vehicle moves away
      if (distance > 1000) { // Reset when vehicle is 1km+ away
        setNotificationSent(false);
      }
    }
  };

  // 2. Firebase Cloud Messaging setup: ask for notification permission
  useEffect(() => {
    const setupFCM = async () => {
      try {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          console.log('Authorization status:', authStatus);
          await messaging().registerDeviceForRemoteMessages();
        }
      } catch (e) {
        console.log('FCM permission error:', e);
      }
    };
    setupFCM();
  }, []);

  // 3. Listen for foreground FCM notifications
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('FCM Message received in foreground:', remoteMessage);
      
      const title = remoteMessage.notification?.title || 'Notification';
      const body = remoteMessage.notification?.body || 'You have a new message';
      
      Alert.alert(title, body);
    });
    return unsubscribe;
  }, []);

  // 4. Listen for notification taps (background/quit)
  useEffect(() => {
    const unsubscribe = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification caused app to open from background:', remoteMessage);
    });
    
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('Notification caused app to open from quit state:', remoteMessage);
        }
      });
    
    return unsubscribe;
  }, []);

  // 5. Login handler (get FCM token and send to backend)
  const handleLogin = async () => {
    try {
      const res = await axios.post(`${BACKEND_URL}/users/login`, {
        email,
        password,
      });
      setJwt(res.data.access_token);
      setUser(res.data.user);

      // Get and send FCM token to backend
      try {
        const fcmToken = await messaging().getToken();
        console.log('FCM Token:', fcmToken);
        
        await axios.post(`${BACKEND_URL}/users/update-fcm-token`, {
          user_id: res.data.user.id,
          fcm_token: fcmToken,
        });
        console.log('FCM token sent to backend successfully');
      } catch (fcmError) {
        console.error('Error handling FCM token:', fcmError);
      }

      // Get user location
      let loc = res.data.user.location;
      if (!loc || !loc.latitude || !loc.longitude) {
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) {
          Alert.alert('Permission denied', 'Location permission is required.');
          return;
        }
        Geolocation.getCurrentPosition(
          (position) => {
            loc = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            setUserLocation(loc);

            // Send user location to backend via WebSocket
            const wsUser = new WebSocket(`${BACKEND_URL.replace('http', 'ws')}/ws/user-location`);
            wsUserRef.current = wsUser;
            wsUser.onopen = () => {
              wsUser.send(
                JSON.stringify({
                  user_id: res.data.user.id,
                  location: loc,
                })
              );
            };
          },
          (error) => {
            Alert.alert('Location error', error.message);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
        return;
      }
      setUserLocation(loc);

      // Send user location to backend via WebSocket
      const wsUser = new WebSocket(`${BACKEND_URL.replace('http', 'ws')}/ws/user-location`);
      wsUserRef.current = wsUser;
      wsUser.onopen = () => {
        wsUser.send(
          JSON.stringify({
            user_id: res.data.user.id,
            location: loc,
          })
        );
      };
    } catch (e) {
      console.error('Login error:', e);
      Alert.alert('Login error', 'Failed to log in. Check your credentials and network.');
    }
  };

  // 6. Real-time user location updates after login
  useEffect(() => {
    const startWatch = async () => {
      if (jwt && user && wsUserRef.current) {
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) {
          Alert.alert('Permission denied', 'Location permission is required.');
          return;
        }
        watchIdRef.current = Geolocation.watchPosition(
          (position) => {
            const coords = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            setUserLocation(coords);
            
            // Check proximity when user location updates
            if (vehicleLocation && tracking && selectedVehicleId) {
              checkProximityAndNotify(coords, vehicleLocation, selectedVehicleId);
            }
            
            try {
              wsUserRef.current?.send(
                JSON.stringify({
                  user_id: user.id,
                  location: coords,
                })
              );
            } catch (err) {
              console.log('WebSocket send error:', err);
            }
          },
          (error) => {
            console.log('Location watch error:', error);
          },
          { enableHighAccuracy: true, distanceFilter: 5, interval: 5000 }
        );
      }
    };
    startWatch();

    return () => {
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [jwt, user, vehicleLocation, tracking, selectedVehicleId]);

  // 7. Fetch all vehicles after login
  useEffect(() => {
    if (!jwt) return;
    const fetchVehicles = async () => {
      try {
        setLoadingVehicles(true);
        const res = await axios.get(`${BACKEND_URL}/vehicles/all`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        setVehicles(res.data);
        if (res.data.length > 0) {
          setSelectedVehicleId(res.data[0].id);
        }
      } catch (e) {
        console.error('Error fetching vehicles:', e);
        Alert.alert('Error', 'Failed to fetch vehicles.');
      } finally {
        setLoadingVehicles(false);
      }
    };
    fetchVehicles();
  }, [jwt]);

  // 8. Start tracking vehicle (WebSocket for real-time updates)
  const startTracking = async () => {
    if (!selectedVehicleId) {
      Alert.alert('Select a vehicle', 'Please select a vehicle to track.');
      return;
    }
    
    // Reset notification state
    setNotificationSent(false);
    setLastNotificationTime(0);
    
    try {
      const res = await axios.get(`${BACKEND_URL}/vehicles/track/${selectedVehicleId.trim()}`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const newVehicleLocation = {
        latitude: res.data.location.latitude,
        longitude: res.data.location.longitude,
      };
      setVehicleLocation(newVehicleLocation);
      
      // Check proximity immediately
      if (userLocation) {
        checkProximityAndNotify(userLocation, newVehicleLocation, selectedVehicleId);
      }
    } catch (e) {
      console.error('Error getting vehicle location:', e);
      Alert.alert('Error', 'Failed to get vehicle location.');
      return;
    }

    // Connect to WebSocket for real-time vehicle updates
    if (wsVehicleRef.current) {
      wsVehicleRef.current.close();
    }
    const ws = new WebSocket(`${BACKEND_URL.replace('http', 'ws')}/ws/track-vehicle`);
    wsVehicleRef.current = ws;

    ws.onopen = () => {
      console.log('Vehicle tracking WebSocket connected');
      ws.send(JSON.stringify({ vehicle_id: selectedVehicleId }));
      setTracking(true);
    };

    ws.onmessage = async (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch (parseError) {
        console.error('Error parsing WebSocket message:', parseError);
        return;
      }
      
      if (!msg.location || msg.vehicle_id !== selectedVehicleId) return;

      const newVehicleLocation = {
        latitude: msg.location.latitude,
        longitude: msg.location.longitude,
      };
      setVehicleLocation(newVehicleLocation);
      
      // Check proximity when vehicle location updates
      if (userLocation && tracking) {
        checkProximityAndNotify(userLocation, newVehicleLocation, selectedVehicleId);
      }
    };

    ws.onerror = (err) => {
      console.error('Vehicle WebSocket error:', err);
    };

    ws.onclose = () => {
      console.log('Vehicle WebSocket closed');
      setTracking(false);
    };
  };

  // 9. Stop tracking
  const stopTracking = () => {
    if (wsVehicleRef.current) {
      wsVehicleRef.current.close();
      wsVehicleRef.current = null;
    }
    setTracking(false);
    setVehicleLocation(null);
    setNotificationSent(false);
    setLastNotificationTime(0);
  };

  // UI
  if (!jwt) {
    return (
      <View style={styles.loginContainer}>
        <Text style={styles.title}>RideAlert Login</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <Button title="Login" onPress={handleLogin} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        mapType="satellite"
        region={
          userLocation
            ? {
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }
            : {
                latitude: 37.78825,
                longitude: -122.4324,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }
        }
        showsUserLocation={true}
        showsMyLocationButton={true}
        loadingEnabled={true}
      >
        {vehicleLocation && (
          <Marker
            coordinate={vehicleLocation}
            title="Vehicle"
            pinColor="blue"
          />
        )}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="You"
            pinColor="green"
          />
        )}
      </MapView>
      <View style={styles.buttonContainer}>
        {loadingVehicles ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <>
            <Text>Select a vehicle to track:</Text>
            <Picker
              selectedValue={selectedVehicleId}
              style={styles.picker}
              onValueChange={(itemValue) => setSelectedVehicleId(itemValue)}
            >
              {vehicles.map((vehicle) => (
                <Picker.Item
                  key={vehicle.id}
                  label={`${vehicle.route} (${vehicle.status})`}
                  value={vehicle.id}
                />
              ))}
            </Picker>
            <Button
              title={tracking ? 'Stop Tracking' : 'Track Vehicle'}
              onPress={tracking ? stopTracking : startTracking}
            />
            <Text style={{ marginTop: 10 }}>
              {tracking
                ? `Tracking vehicle in real-time... ${notificationSent ? '(Notified)' : ''}`
                : 'Press to start tracking.'}
            </Text>
            {userLocation && vehicleLocation && (
              <Text style={{ marginTop: 5, fontSize: 12, color: '#666' }}>
                Distance: {calculateDistance(
                  userLocation.latitude,
                  userLocation.longitude,
                  vehicleLocation.latitude,
                  vehicleLocation.longitude
                ).toFixed(0)}m
              </Text>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  map: {
    flex: 1,
    minHeight: 300,
    width: '100%',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 10,
    borderRadius: 10,
  },
  picker: {
    height: 50,
    width: 250,
  },
});