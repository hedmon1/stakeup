import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { User } from 'firebase/auth';

import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { colors } from '../theme';
import { onAuthChanged } from '../services/auth';
import { AppUser, FriendGroup } from '../types';

import SignInScreen       from '../screens/SignInScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import TutorialScreen     from '../screens/TutorialScreen';
import GroupsListScreen   from '../screens/GroupsListScreen';
import TodayScreen        from '../screens/TodayScreen';
import GroupChatScreen    from '../screens/GroupChatScreen';
import ScoreboardScreen   from '../screens/ScoreboardScreen';
import CatalogScreen      from '../screens/CatalogScreen';
import ProgressScreen     from '../screens/ProgressScreen';
import ProfileScreen      from '../screens/ProfileScreen';

// ── Param lists ──────────────────────────────────────────────────────────────
export type RootStackParams = {
  Auth: undefined;
  ProfileSetup: { uid: string };
  Tutorial: { uid: string };
  Main: { currentUser: AppUser };
};
export type MainTabParams = {
  Groups: { currentUser: AppUser };
  Profile: { currentUser: AppUser };
};
export type GroupsStackParams = {
  GroupsList: { currentUser: AppUser };
  GroupHome: { group: FriendGroup; currentUser: AppUser };
};
export type GroupTabParams = {
  Today: { group: FriendGroup; currentUser: AppUser };
  Chat: { group: FriendGroup; currentUser: AppUser };
  Goals: { group: FriendGroup; currentUser: AppUser };
  Board: { group: FriendGroup };
  Rewards: { group: FriendGroup; currentUser: AppUser; myPoints: number };
};

const Root    = createNativeStackNavigator<RootStackParams>();
const Tab     = createBottomTabNavigator<MainTabParams>();
const GStack  = createNativeStackNavigator<GroupsStackParams>();
const GroupTab = createBottomTabNavigator<GroupTabParams>();

const tabBarStyle = { backgroundColor: colors.bg, borderTopColor: colors.separator, borderTopWidth: 0.5 };
const GROUP_TAB_ICON: Record<string, any> = {
  Today: 'home', Chat: 'message-circle', Goals: 'target', Board: 'award', Rewards: 'gift',
};

const darkNav = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.bg, text: colors.primary, border: colors.separator },
};

// In-group bottom tabs: Today · Chat · Goals · Board · Rewards
function GroupHome({ route }: any) {
  const { group, currentUser } = route.params;
  return (
    <GroupTab.Navigator screenOptions={({ route: r }) => ({
      headerShown: false,
      tabBarStyle,
      tabBarActiveTintColor: colors.blue,
      tabBarInactiveTintColor: colors.tertiary,
      tabBarIcon: ({ color, size }) => (
        <Feather name={GROUP_TAB_ICON[r.name]} size={size} color={color} />
      ),
    })}>
      <GroupTab.Screen name="Today"   component={TodayScreen}
        initialParams={{ group, currentUser }} />
      <GroupTab.Screen name="Chat"    component={GroupChatScreen}
        initialParams={{ group, currentUser }} />
      <GroupTab.Screen name="Goals"   component={ProgressScreen}
        initialParams={{ group, currentUser }} />
      <GroupTab.Screen name="Board"   component={ScoreboardScreen}
        initialParams={{ group }} options={{ title: 'Leaderboard' }} />
      <GroupTab.Screen name="Rewards" component={CatalogScreen}
        initialParams={{ group, currentUser, myPoints: 0 }} />
    </GroupTab.Navigator>
  );
}

function GroupsStack({ route }: any) {
  const { currentUser } = route.params;
  return (
    <GStack.Navigator screenOptions={{
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.blue,
      headerTitleStyle: { color: colors.primary, fontWeight: '600' },
      headerShadowVisible: false,
    }}>
      <GStack.Screen name="GroupsList" component={GroupsListScreen}
        initialParams={{ currentUser }} options={{ title: 'Groups' }} />
      <GStack.Screen name="GroupHome" component={GroupHome}
        options={({ route }: any) => ({ title: route.params.group.name })} />
    </GStack.Navigator>
  );
}

function MainTabs({ route }: any) {
  const { currentUser } = route.params;
  return (
    <Tab.Navigator screenOptions={({ route: r }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.blue,
      tabBarInactiveTintColor: colors.tertiary,
      tabBarIcon: ({ color, size }) => {
        const icon = r.name === 'Groups' ? 'users' : 'user';
        return <Feather name={icon as any} size={size} color={color} />;
      },
    })}>
      <Tab.Screen
        name="Groups"
        component={GroupsStack}
        initialParams={{ currentUser }}
        options={({ route: r }) => {
          // Hide the outer tab bar while inside a group (GroupHome has its own tabs)
          const focused = getFocusedRouteNameFromRoute(r) ?? 'GroupsList';
          return { tabBarStyle: focused === 'GroupHome' ? { display: 'none' } : tabBarStyle };
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} initialParams={{ currentUser }}
        options={{ tabBarStyle }} />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const [fbUser, setFbUser]       = useState<User | null | undefined>(undefined);
  const [appUser, setAppUser]     = useState<AppUser | null>(null);
  const [checking, setChecking]   = useState(true);

  useEffect(() => {
    let unsubDoc: (() => void) | null = null;

    const unsubAuth = onAuthChanged(user => {
      setFbUser(user);
      setChecking(false);

      // Stop any previous user-doc listener
      if (unsubDoc) { unsubDoc(); unsubDoc = null; }

      if (!user) { setAppUser(null); return; }

      // Listen to the Firestore user doc in real-time so that as soon
      // as ProfileSetup creates it, Navigation automatically advances.
      unsubDoc = onSnapshot(doc(db, 'users', user.uid), snap => {
        if (snap.exists()) {
          const d = snap.data();
          setAppUser({
            id: snap.id,
            displayName: d.displayName ?? '',
            photoURL: d.photoURL,
            phone: d.phone,
            createdAt: d.createdAt?.toDate() ?? new Date(),
            fcmTokens: d.fcmTokens ?? [],
            tutorialSeen: d.tutorialSeen ?? false,
          });
        } else {
          setAppUser(null);
        }
      });
    });

    return () => { unsubAuth(); if (unsubDoc) unsubDoc(); };
  }, []);

  if (checking) return null;

  return (
    <NavigationContainer theme={darkNav}>
      <Root.Navigator screenOptions={{ headerShown: false }}>
        {!fbUser ? (
          <Root.Screen name="Auth" component={SignInScreen} />
        ) : !appUser ? (
          <Root.Screen name="ProfileSetup" component={ProfileSetupScreen}
            initialParams={{ uid: fbUser.uid }} />
        ) : !appUser.tutorialSeen ? (
          <Root.Screen name="Tutorial" component={TutorialScreen}
            initialParams={{ uid: appUser.id }} />
        ) : (
          <Root.Screen name="Main" component={MainTabs}
            initialParams={{ currentUser: appUser }} />
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
}
