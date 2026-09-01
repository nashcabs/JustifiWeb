import {
  deleteApp,
  initializeApp
} from 'firebase/app';

import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';

import {
   addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where
} from 'firebase/firestore';

import { auth, db } from './firebaseClient.js';
import firebaseConfig from '../config/firebaseConfig.js';

const DEFAULT_SCHOOL_ID = 'mdps';
const DEFAULT_SCHOOL_NAME = 'Mother of Divine Providence School';

export const STANDARD_SECTIONS = [
  'Grade 11 - Section A',
  'Grade 11 - Section B',
  'Grade 12 - Section A',
  'Grade 12 - Section B',
  'No Section'
];

const ALLOWED_SELF_REGISTRATION_ROLES = new Set([
  'student',
  'nonStudent'
]);

const APP_ORIGIN =
  typeof window !== 'undefined'
    ? window.location.origin
    : 'https://justifi-4a327.web.app';

const EMAIL_ACTION_SETTINGS = {
  url: `${APP_ORIGIN}/login`,
  handleCodeInApp: false
};

function normalizeRole(value, fallback = 'student') {
  const role = String(value || fallback).trim();

  if (role.toLowerCase() === 'nonstudent') {
    return 'nonStudent';
  }

  if (role === 'teacher') {
    return 'teacher';
  }

  if (role === 'developer') {
    return 'developer';
  }

  if (role.toLowerCase() === 'admin') {
    return 'developer';
  }

  return 'student';
}


function buildFullName(profile = {}) {
  return [
    profile.firstName,
    profile.middleName,
    profile.lastName
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' ');
}

function normalizeProfileImage(profile) {
  const image =
    profile && profile.profileImage
      ? profile.profileImage
      : {};

  const localPath = image.localPath || '';
  const cloudUrl = image.cloudUrl || '';
  const thumbnailUrl = image.thumbnailUrl || '';

  return {
    localPath,
    cloudUrl,
    thumbnailUrl,
    avatarDataUrl: thumbnailUrl || cloudUrl || localPath || ''
  };
}

function normalizeAssignedSections(profile = {}) {
  if (Array.isArray(profile.assignedSections) && profile.assignedSections.length) {
    return profile.assignedSections;
  }

  return profile.assignedSection ? [profile.assignedSection] : [];
}

function logFirebaseError(stage, error) {
  console.error(`[JustiFi] ${stage}`, {
    code: error?.code,
    message: error?.message,
    name: error?.name,
    stack: error?.stack,
    customData: error?.customData,
    error
  });
}

async function getProfile(uid) {
  const snapshot = await getDoc(
    doc(db, 'users', uid)
  );

  return snapshot.exists()
    ? snapshot.data()
    : null;
}

async function mapUser(firebaseUser) {
  if (!firebaseUser) {
    return null;
  }

  const profile =
    (await getProfile(firebaseUser.uid)) || {};

  const image = normalizeProfileImage(profile);

  return {
    id: firebaseUser.uid,
    uid: firebaseUser.uid,

    email:
      firebaseUser.email ||
      profile.email ||
      '',

    role: normalizeRole(profile.role),

    schoolId: profile.schoolId ?? null,
    schoolName: profile.schoolName || '',

    firstName: profile.firstName || '',
    middleName: profile.middleName || '',
    lastName: profile.lastName || '',
    fullName:
      profile.fullName ||
      buildFullName(profile),

    birthdate: profile.birthdate || '',
    age: profile.age || '',
    sex: profile.sex || '',

    studentId:
      profile.studentId ||
      profile.studentNumber ||
      '',

    studentNumber:
      profile.studentNumber ||
      profile.studentId ||
      '',

    gradeLevel: profile.gradeLevel || '',
    sectionId: profile.sectionId || '',
    section: profile.section || '',

    teacherId: profile.teacherId || '',
    adminId: profile.adminId || '',
    department: profile.department || '',
    position: profile.position || '',

    assignedGradeLevel:
      profile.assignedGradeLevel || '',

    assignedSection:
      profile.assignedSection || '',

    assignedGradeLevels:
      Array.isArray(profile.assignedGradeLevels)
        ? profile.assignedGradeLevels
        : [],

    assignedSections: normalizeAssignedSections(profile),

    isActive: profile.isActive !== false && profile.accountStatus !== 'inactive',

    accountStatus:
      profile.accountStatus || 'active',

    profileCompleted:
      Boolean(profile.profileCompleted),

    badges:
      Array.isArray(profile.badges)
        ? profile.badges
        : [],

    quizScores:
      Array.isArray(profile.quizScores)
        ? profile.quizScores
        : [],

    progress:
      Array.isArray(profile.progress)
        ? profile.progress
        : [],

    profileImage: {
      localPath: image.localPath,
      cloudUrl: image.cloudUrl,
      thumbnailUrl: image.thumbnailUrl
    },

    avatarDataUrl: image.avatarDataUrl,

    createdAt: profile.createdAt || null,
    updatedAt: profile.updatedAt || null,

    emailVerified:
      Boolean(firebaseUser.emailVerified)
  };
}

function mapProfileDoc(id, profile = {}) {
  const image = normalizeProfileImage(profile);

  return {
    id,
    uid: id,

    email: profile.email || '',
    role: normalizeRole(profile.role),

    schoolId: profile.schoolId ?? null,
    schoolName: profile.schoolName || '',

    firstName: profile.firstName || '',
    middleName: profile.middleName || '',
    lastName: profile.lastName || '',
    fullName:
      profile.fullName ||
      buildFullName(profile),

    birthdate: profile.birthdate || '',
    age: profile.age || '',
    sex: profile.sex || '',

    studentId:
      profile.studentId ||
      profile.studentNumber ||
      '',

    studentNumber:
      profile.studentNumber ||
      profile.studentId ||
      '',

    gradeLevel: profile.gradeLevel || '',
    sectionId: profile.sectionId || '',
    section: profile.section || '',

    teacherId: profile.teacherId || '',
    adminId: profile.adminId || '',
    department: profile.department || '',
    position: profile.position || '',

    assignedGradeLevel:
      profile.assignedGradeLevel || '',

    assignedSection:
      profile.assignedSection || '',

    assignedGradeLevels:
      Array.isArray(profile.assignedGradeLevels)
        ? profile.assignedGradeLevels
        : [],

    assignedSections: normalizeAssignedSections(profile),

    isActive: profile.isActive !== false && profile.accountStatus !== 'inactive',

    accountStatus:
      profile.accountStatus || 'active',

    profileCompleted:
      Boolean(profile.profileCompleted),

    badges:
      Array.isArray(profile.badges)
        ? profile.badges
        : [],

    quizScores:
      Array.isArray(profile.quizScores)
        ? profile.quizScores
        : [],

    progress:
      Array.isArray(profile.progress)
        ? profile.progress
        : [],

    profileImage: {
      localPath: image.localPath,
      cloudUrl: image.cloudUrl,
      thumbnailUrl: image.thumbnailUrl
    },

    avatarDataUrl: image.avatarDataUrl,

    createdAt: profile.createdAt || null,
    updatedAt: profile.updatedAt || null,

    emailVerified: false
  };
}

export function formatRoleLabel(role) {
  const normalized = String(role || '').trim().toLowerCase();

  if (normalized === 'developer') {
    return 'Organizational Admin';
  }

  if (normalized === 'teacher') {
    return 'Teacher';
  }

  if (normalized === 'nonstudent') {
    return 'Non-Student';
  }

  if (normalized === 'student') {
    return 'Student';
  }

  return 'Student';
}

export function getDisplayName(user) {
  if (!user) {
    return 'Login';
  }

  if (user.role === 'developer') {
    return 'Organizational Admin';
  }

  const name = [
    user.firstName,
    user.lastName
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' ');

  return (
    name ||
    user.fullName ||
    user.email ||
    'User'
  );
}

export function getDashboardPath(user) {
  if (!user) {
    return '/login';
  }

  if (user.role === 'teacher') {
    return '/dashboard/teacher';
  }

  if (user.role === 'developer') {
    return '/dashboard/developer';
  }

  return '/login';
}

export function onAuthStateChanged(callback) {
  return firebaseOnAuthStateChanged(
    auth,
    async (firebaseUser) => {
      try {
        const user = firebaseUser
          ? await mapUser(firebaseUser)
          : null;

        callback(user);
      } catch (error) {
        logFirebaseError(
          'Failed to map authenticated user',
          error
        );

        callback(null);
      }
    }
  );
}

async function createUserProfileIfMissing(
  firebaseUser,
  pendingProfile = {}
) {
  const userRef = doc(
    db,
    'users',
    firebaseUser.uid
  );

  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    return;
  }

  const requestedRole = normalizeRole(
    pendingProfile.role,
    'student'
  );

  const role =
    ALLOWED_SELF_REGISTRATION_ROLES.has(requestedRole)
      ? requestedRole
      : 'student';

  const isNonStudent =
    role === 'nonStudent';

  const profile = {
    uid: firebaseUser.uid,

    email:
      firebaseUser.email ||
      pendingProfile.email ||
      '',

    role,

    schoolId: isNonStudent
      ? null
      : pendingProfile.schoolId ||
        DEFAULT_SCHOOL_ID,

    schoolName: isNonStudent
      ? ''
      : pendingProfile.schoolName ||
        DEFAULT_SCHOOL_NAME,

    firstName:
      String(pendingProfile.firstName || '').trim(),

    middleName:
      String(pendingProfile.middleName || '').trim(),

    lastName:
      String(pendingProfile.lastName || '').trim(),

    fullName:
      buildFullName(pendingProfile),

    birthdate:
      pendingProfile.birthdate || '',

    age:
      pendingProfile.age || '',

    sex:
      pendingProfile.sex || '',

    studentId:
      pendingProfile.studentId ||
      pendingProfile.studentNumber ||
      '',

    studentNumber:
      pendingProfile.studentNumber ||
      pendingProfile.studentId ||
      '',

    gradeLevel: isNonStudent
      ? ''
      : pendingProfile.gradeLevel || '',

    sectionId: isNonStudent
      ? ''
      : pendingProfile.sectionId || '',

    section: isNonStudent
      ? ''
      : pendingProfile.section || '',

    teacherId: '',
    adminId: '',
    department: '',
    position: '',

    assignedGradeLevel: '',
    assignedSection: '',
    assignedGradeLevels: [],
    assignedSections: [],

    isActive: true,

    accountStatus: 'active',
    profileCompleted: false,

    badges: [],
    quizScores: [],
    progress: [],

    profileImage: {
      localPath: '',
      cloudUrl: ''
    },

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(userRef, profile);
}

export async function registerUser(payload = {}) {
  const normalizedEmail =
    String(payload.email || '')
      .toLowerCase()
      .trim();

  const password =
    String(payload.password || '');

  if (!normalizedEmail) {
    throw new Error('Email is required.');
  }

  if (!password) {
    throw new Error('Password is required.');
  }

  let stage =
    'creating authentication user';

  try {
    const credential =
      await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
      );

    stage =
      'sending verification email';

    await sendEmailVerification(
      credential.user,
      EMAIL_ACTION_SETTINGS
    );

    stage =
      'creating Firestore profile';

    await createUserProfileIfMissing(
      credential.user,
      {
        ...payload,
        email: normalizedEmail
      }
    );

    stage =
      'signing out after registration';

    await signOut(auth);

    return {
      pendingVerification: true,
      email: normalizedEmail
    };
  } catch (error) {
    logFirebaseError(
      `Registration failed while ${stage}`,
      error
    );

    throw error;
  }
}

export async function createUserAccountByAdmin({
  email = '',
  password = '',
  firstName = '',
  lastName = '',
  role = 'student',
  gradeLevel = '',
  section = 'No Section',
  assignedSections = [],
  isActive = true
} = {}) {
  const normalizedEmail = String(email || '').toLowerCase().trim();

  if (!normalizedEmail) {
    throw new Error('Email is required.');
  }

  if (!password) {
    throw new Error('Password is required.');
  }

  if (!auth.currentUser) {
    throw new Error('Your admin session expired. Please sign in again as an Organizational Admin.');
  }

  const secondaryApp = initializeApp(
    firebaseConfig,
    `account-creation-${Date.now()}`
  );
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const { user: createdUser } = await createUserWithEmailAndPassword(
      secondaryAuth,
      normalizedEmail,
      String(password)
    );

    const firstNameValue = String(firstName || '').trim();
    const lastNameValue = String(lastName || '').trim();
    const safeRole = normalizeRole(role, 'student');
    const normalizedSection = STANDARD_SECTIONS.includes(section) ? section : 'No Section';
    const normalizedSections = Array.isArray(assignedSections)
      ? assignedSections.filter((item) => typeof item === 'string' && item.trim())
      : [];

    await setDoc(doc(db, 'users', createdUser.uid), {
      uid: createdUser.uid,
      email: normalizedEmail,
      firstName: firstNameValue,
      lastName: lastNameValue,
      fullName: `${firstNameValue} ${lastNameValue}`.trim(),
      role: safeRole,
      schoolId: safeRole === 'nonStudent' ? null : DEFAULT_SCHOOL_ID,
      schoolName: safeRole === 'nonStudent' ? '' : DEFAULT_SCHOOL_NAME,
      gradeLevel: safeRole === 'student' ? String(gradeLevel || '').trim() : '',
      section: safeRole === 'student' ? normalizedSection : '',
      assignedGradeLevel: safeRole === 'teacher' ? String(gradeLevel || '').trim() : '',
      assignedSection: safeRole === 'teacher' && normalizedSection !== 'No Section' ? normalizedSection : '',
      assignedSections: safeRole === 'teacher'
        ? (normalizedSections.length ? normalizedSections : (normalizedSection !== 'No Section' ? [normalizedSection] : []))
        : [],
      isActive: isActive !== false,
      accountStatus: isActive !== false ? 'active' : 'inactive',
      profileCompleted: false,
      badges: [],
      quizScores: [],
      progress: [],
      profileImage: { localPath: '', cloudUrl: '' },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await sendEmailVerification(createdUser, EMAIL_ACTION_SETTINGS);

    return {
      uid: createdUser.uid,
      email: normalizedEmail,
      role: safeRole,
      firstName: firstNameValue,
      lastName: lastNameValue,
      fullName: `${firstNameValue} ${lastNameValue}`.trim(),
      isActive: isActive !== false
    };
  } catch (error) {
    const message = error?.message || 'Failed to create account.';
    throw new Error(message.replace(/^FirebaseError:\s*/, ''));
  } finally {
    await deleteApp(secondaryApp);
  }
}

export async function login(
  email,
  password,
  { remember } = { remember: false }
) {
  const normalizedEmail =
    String(email || '')
      .toLowerCase()
      .trim();

  await setPersistence(
    auth,
    remember
      ? browserLocalPersistence
      : browserSessionPersistence
  );

  const credential =
    await signInWithEmailAndPassword(
      auth,
      normalizedEmail,
      password
    );

  if (!credential.user.emailVerified) {
    try {
      await sendEmailVerification(
        credential.user,
        EMAIL_ACTION_SETTINGS
      );
    } catch (error) {
      logFirebaseError(
        'Failed to resend verification email',
        error
      );
    }

    await signOut(auth);

    throw new Error(
      "Email not verified yet. We've sent you a verification link. Please verify your email, then log in again."
    );
  }

  await createUserProfileIfMissing(
    credential.user,
    {
      email:
        credential.user.email || ''
    }
  );

  const user = await mapUser(credential.user);
  if (user && !user.isActive) {
    await signOut(auth);
    throw new Error('This account is inactive. Please contact an organizational administrator.');
  }

  return user;
}

export async function logout() {
  await signOut(auth);
}

export async function getCurrentUser() {
  const firebaseUser =
    auth.currentUser;

  return firebaseUser
    ? mapUser(firebaseUser)
    : null;
}

export async function resetPassword(email) {
  const normalizedEmail =
    String(email || '')
      .toLowerCase()
      .trim();

  await sendPasswordResetEmail(
    auth,
    normalizedEmail
  );
}

export function isConfigured() {
  return Boolean(auth && db);
}

export function getFirestore() {
  return db;
}

export async function updateCurrentUserProfile(
  patch = {}
) {
  const firebaseUser =
    auth.currentUser;

  if (!firebaseUser) {
    throw new Error('Not logged in');
  }

  const userRef = doc(
    db,
    'users',
    firebaseUser.uid
  );

  const {
    role: ignoredRole,
    uid: ignoredUid,
    createdAt: ignoredCreatedAt,
    ...safePatch
  } = patch;

  void ignoredRole;
  void ignoredUid;
  void ignoredCreatedAt;

  await setDoc(
    userRef,
    {
      ...safePatch,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  return mapUser(firebaseUser);
}

export async function updateUserProfileById(
  userId,
  patch = {}
) {
  if (!userId) {
    throw new Error('Missing user id');
  }

  const userRef = doc(
    db,
    'users',
    userId
  );

  const {
    uid: ignoredUid,
    createdAt: ignoredCreatedAt,
    ...safePatch
  } = patch;

  void ignoredUid;
  void ignoredCreatedAt;

  await setDoc(
    userRef,
    {
      ...safePatch,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  const snapshot =
    await getDoc(userRef);

  return snapshot.exists()
    ? mapProfileDoc(
        snapshot.id,
        snapshot.data()
      )
    : null;
}

export async function deleteUserProfileById(userId) {
  if (!userId) {
    throw new Error('Missing user id');
  }

  if (auth.currentUser?.uid === userId) {
    throw new Error('You cannot delete your own administrator account.');
  }

  await deleteDoc(doc(db, 'users', userId));
}

export async function deactivateUserProfileById(userId) {
  if (!userId) {
    throw new Error('Missing user id');
  }

  if (auth.currentUser?.uid === userId) {
    throw new Error('You cannot deactivate your own administrator account.');
  }

  await updateDoc(doc(db, 'users', userId), {
    isActive: false,
    accountStatus: 'inactive',
    updatedAt: serverTimestamp()
  });
}

export async function getAllUsers() {
  const snapshot =
    await getDocs(
      collection(db, 'users')
    );

  return snapshot.docs.map(
    (documentSnapshot) =>
      mapProfileDoc(
        documentSnapshot.id,
        documentSnapshot.data()
      )
  );
}

export function subscribeToUsers(
  onNext,
  onError
) {
  return onSnapshot(
    collection(db, 'users'),
    (snapshot) => {
      const users =
        snapshot.docs.map(
          (documentSnapshot) =>
            mapProfileDoc(
              documentSnapshot.id,
              documentSnapshot.data()
            )
        );

      onNext?.(users);
    },
    (error) => {
      onError?.(error);
    }
  );
}

export async function getStudents(viewer = null, options = {}) {
  const queryParts = [
    where('role', '==', 'student')
  ];

  const viewerRole =
    normalizeRole(viewer?.role, '');

  const viewerSchoolId =
    String(viewer?.schoolId || '').trim();

  // Log for debugging: check if teacher has schoolId
  if (viewerRole === 'teacher') {
    console.log('[JustiFi] Teacher viewer schoolId:', viewerSchoolId || '(empty)');
  }

  // For teachers with a schoolId, try filtering by school first
  // If no students found with school filter, fall back to all students
  let useSchoolFilter = false;
  if (
    viewerRole === 'teacher' &&
    viewerSchoolId
  ) {
    useSchoolFilter = true;
    queryParts.push(
      where(
        'schoolId',
        '==',
        viewerSchoolId
      )
    );
  }

  const teacherSections = viewerRole === 'teacher'
    ? new Set([
        ...(Array.isArray(viewer?.assignedSections) ? viewer.assignedSections : []),
        ...(viewer?.assignedSection ? [viewer.assignedSection] : [])
      ])
    : null;

  const filterTeacherRoster = (rows) => {
    if (viewerRole !== 'teacher') return rows;

    return rows.filter((student) => {
      const section = String(student.section || '').trim();
      return !section || section === 'No Section' || teacherSections.has(section);
    });
  };

  const filterVisibleStudentRows = (rows) => {
    return rows.filter((row) => normalizeRole(row?.role, 'student') === 'student');
  };

  const pageSizeValue =
    typeof options?.pageSize !== 'undefined'
      ? Number(options.pageSize)
      : undefined;

  const isPaginated =
    Number.isFinite(pageSizeValue) &&
    pageSizeValue > 0;

  const cursor = options?.cursor || null;

  try {
    if (!isPaginated) {
      const snapshot = await getDocs(
        query(
          collection(db, 'users'),
          ...queryParts
        )
      );

      let results = snapshot.docs.map(
        (documentSnapshot) =>
          mapProfileDoc(
            documentSnapshot.id,
            documentSnapshot.data()
          )
      );

      results = filterVisibleStudentRows(results);
      results = filterTeacherRoster(results);

      // If teacher has school filter and got 0 results, try without schoolId filter
      // to check if students exist but lack schoolId field
      if (
        viewerRole === 'teacher' &&
        useSchoolFilter &&
        results.length === 0
      ) {
        console.log('[JustiFi] No students found with schoolId filter, trying without school filter...');
        
        const fallbackQueryParts = [where('role', '==', 'student')];

        const fallbackSnapshot = await getDocs(
          query(
            collection(db, 'users'),
            ...fallbackQueryParts
          )
        );

        const fallbackResults = filterTeacherRoster(
          filterVisibleStudentRows(
            fallbackSnapshot.docs.map(
              (documentSnapshot) =>
                mapProfileDoc(
                  documentSnapshot.id,
                  documentSnapshot.data()
                )
            )
          )
        );

        if (fallbackResults.length > 0) {
          console.log('[JustiFi] WARNING: Found', fallbackResults.length, 'students WITHOUT schoolId field. These need to be updated to have schoolId:', viewerSchoolId);
          results = fallbackResults;
        }
      }

      console.log('[JustiFi] getStudents() returned', results.length, 'students');
      return results;
    }

    const pageSize = Math.min(
      Math.max(1, Math.trunc(pageSizeValue)),
      50
    );

    const queryArgs = [
      collection(db, 'users'),
      ...queryParts
    ];

    if (viewerRole === 'teacher') {
      const snapshot = await getDocs(query(...queryArgs));
      const items = filterTeacherRoster(
        filterVisibleStudentRows(snapshot.docs.map((documentSnapshot) =>
          mapProfileDoc(documentSnapshot.id, documentSnapshot.data())
        ))
      );

      return {
        success: true,
        items,
        pageSize: items.length,
        hasMore: false,
        nextCursor: null
      };
    }

    if (cursor) {
      queryArgs.push(startAfter(cursor));
    }

    queryArgs.push(limit(pageSize + 1));

    const snapshot = await getDocs(query(...queryArgs));

    const items = filterTeacherRoster(
      filterVisibleStudentRows(snapshot.docs
        .slice(0, pageSize)
        .map((documentSnapshot) =>
          mapProfileDoc(
            documentSnapshot.id,
            documentSnapshot.data()
          )
        ))
    );

    const hasMore = snapshot.docs.length > pageSize;
    const nextCursor =
      hasMore && snapshot.docs[pageSize - 1]
        ? snapshot.docs[pageSize - 1]
        : null;

    return {
      success: true,
      items,
      pageSize,
      hasMore,
      nextCursor
    };
  } catch (error) {
    const isPermissionDenied =
      error?.code === 'permission-denied';

    const status = isPermissionDenied ? 403 : 500;
    const code =
      error?.code ||
      'student-list-error';
    const message = isPermissionDenied
      ? 'You do not have permission to view this student list.'
      : 'Failed to load the student list.';

    logFirebaseError('getStudents', error);

    const wrappedError = new Error(message);
    wrappedError.status = status;
    wrappedError.code = code;
    wrappedError.payload = error;
    wrappedError.response = {
      success: false,
      status,
      code,
      message
    };

    throw wrappedError;
  }
}

export async function updateUserRoleByEmail(
  email,
  newRole,
  assignedGradeLevel = '',
  assignedSection = '',
  assignedSections = []
) {
  const normalizedEmail =
    String(email || '')
      .toLowerCase()
      .trim();

  if (!normalizedEmail) {
    throw new Error('Email is required');
  }

  const role =
    normalizeRole(
      newRole,
      'student'
    );

  const result =
    await getDocs(
      query(
        collection(db, 'users'),
        where(
          'email',
          '==',
          normalizedEmail
        ),
        limit(1)
      )
    );

  if (result.empty) {
    throw new Error('User not found');
  }

  const documentSnapshot =
    result.docs[0];

  const userRef = doc(
    db,
    'users',
    documentSnapshot.id
  );

  const patch = {
    role,
    updatedAt: serverTimestamp()
  };

  if (role === 'teacher') {
    patch.assignedGradeLevel =
      String(
        assignedGradeLevel || ''
      ).trim();

    patch.assignedSection =
      String(
        assignedSection || ''
      ).trim();

    patch.assignedSections = Array.isArray(assignedSections) && assignedSections.length
      ? assignedSections
      : (patch.assignedSection ? [patch.assignedSection] : []);

    // Ensure teachers have a schoolId if one is not already set
    if (!documentSnapshot.data()?.schoolId) {
      patch.schoolId = DEFAULT_SCHOOL_ID;
      patch.schoolName = DEFAULT_SCHOOL_NAME;
    }
  } else {
    patch.assignedGradeLevel = '';
    patch.assignedSection = '';
    patch.assignedSections = [];
  }

  await updateDoc(
    userRef,
    patch
  );

  const updatedSnapshot =
    await getDoc(userRef);

  return updatedSnapshot.exists()
    ? mapProfileDoc(
        updatedSnapshot.id,
        updatedSnapshot.data()
      )
    : null;
}

export async function migrateStudentsToHaveSchoolId() {
  const allStudents = await getDocs(
    query(
      collection(db, 'users'),
      where('role', '==', 'student')
    )
  );

  console.log('[JustiFi] Checking', allStudents.docs.length, 'students for schoolId...');

  const needsMigration = [];
  for (const studentDoc of allStudents.docs) {
    const data = studentDoc.data();
    if (!data.schoolId) {
      needsMigration.push({
        uid: studentDoc.id,
        email: data.email,
        name: [data.firstName, data.lastName].filter(Boolean).join(' ')
      });
    }
  }

  if (needsMigration.length === 0) {
    console.log('[JustiFi] All students have schoolId! No migration needed.');
    return { success: true, updated: 0 };
  }

  console.log('[JustiFi] Found', needsMigration.length, 'students needing schoolId migration:');
  console.log(needsMigration);

  let updated = 0;
  for (const student of needsMigration) {
    try {
      const userRef = doc(db, 'users', student.uid);
      await updateDoc(userRef, {
        schoolId: DEFAULT_SCHOOL_ID,
        schoolName: DEFAULT_SCHOOL_NAME,
        updatedAt: serverTimestamp()
      });
      updated++;
    } catch (error) {
      console.error('[JustiFi] Failed to update student', student.email, ':', error.message);
    }
  }

  console.log('[JustiFi] Migration complete! Updated', updated, 'students.');
  return {
    success: true,
    checked: allStudents.docs.length,
    needsMigration: needsMigration.length,
    updated
  };
}
export async function submitContactMessage(payload = {}) {
  const name = String(payload.name || '').trim();
  const email = String(payload.email || '').trim();
  const subject = String(payload.subject || '').trim();
  const message = String(payload.message || '').trim();

  if (!name || !email || !subject || !message) {
    throw new Error('Please complete all contact form fields.');
  }

  const docRef = await addDoc(collection(db, 'contactMessages'), {
    name,
    email,
    subject,
    message,
    status: 'unread',
    source: 'landing-page',
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}
export function subscribeToContactMessages(onNext, onError) {
  const messagesQuery = query(
    collection(db, 'contactMessages'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const messages = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data()
      }));

      onNext?.(messages);
    },
    (error) => {
      console.error('Failed to load contact messages:', error);
      onError?.(error);
    }
  );
}

export async function updateContactMessageStatus(
  messageId,
  status
) {
  const allowedStatuses = [
    'unread',
    'read',
    'resolved'
  ];

  if (!allowedStatuses.includes(status)) {
    throw new Error('Invalid inquiry status.');
  }

 await updateDoc(
  doc(db, 'contactMessages', messageId),
  {
    status,
    updatedAt: serverTimestamp()
  }
);
}