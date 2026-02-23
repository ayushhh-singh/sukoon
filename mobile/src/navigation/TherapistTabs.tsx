import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, Users, FileText, Pill, UserCircle } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import DashboardScreen from '../screens/therapist/DashboardScreen';
import PatientsScreen from '../screens/therapist/PatientsScreen';
import NotesScreen from '../screens/therapist/NotesScreen';
import MedicationsScreen from '../screens/therapist/MedicationsScreen';
import ProfileScreen from '../screens/therapist/ProfileScreen';

export type TherapistTabParamList = {
  Dashboard: undefined;
  Patients: undefined;
  Notes: undefined;
  Medications: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TherapistTabParamList>();

export default function TherapistTabs() {
  const { c } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accentPrimary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: {
          backgroundColor: c.tabBar,
          borderTopColor: c.tabBarBorder,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Patients"
        component={PatientsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Notes"
        component={NotesScreen}
        options={{
          tabBarIcon: ({ color, size }) => <FileText size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Medications"
        component={MedicationsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Pill size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => <UserCircle size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
