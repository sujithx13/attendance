import { useEffect, useState } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { getMyProfile, type AuthSession, type UserProfile } from '../lib/api';
import { styles } from '../styles';
import { Back } from '../components/ui';
export function ProfileScreen({auth,onBack,onTestingLogout}:{auth:AuthSession;onBack:()=>void;onTestingLogout:()=>void}) {
 const [profile,setProfile]=useState<UserProfile|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{void getMyProfile(auth.token).then(r=>setProfile(r.user)).catch(()=>setError('Could not load profile. Your sign-in is still saved.'));},[auth.token]);
 return <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}><Back onPress={onBack}/><Text style={styles.screenTitle}>Settings</Text>
 <View style={styles.profileViewCard}><Text style={styles.profileNameDisplay}>{profile?.fullName||auth.user.fullName}</Text><Text>{error}</Text>
 {Object.entries({'Email':profile?.email,'Register number':profile?.enrollmentId,'Department':profile?.departmentCode,'Year':profile?.yearOfStudy,'Phone':(profile as any)?.phoneNumber}).map(([key,value])=><View key={key} style={styles.profileInfoRow}><Text style={styles.profileInfoLabel}>{key}</Text><Text style={styles.profileInfoValue}>{value||'—'}</Text></View>)}
 <Text>Your administrator manages these details.</Text></View>
 <View style={styles.profileViewCard}><Text style={styles.screenTitle}>For testing</Text><Pressable accessibilityRole="button" onPress={onTestingLogout} style={styles.confirmButtonSecondary}><Text>Log out</Text></Pressable></View></ScrollView>;
}
