import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where
} from 'firebase/firestore';

import { auth, db } from './firebaseClient.js';

const DEFAULT_SCHOOL_ID = 'mdps';
const DEFAULT_SCHOOL_NAME = 'Mother of Divine Providence School';

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

  return {
    localPath,
    cloudUrl,
    avatarDataUrl: cloudUrl || localPath || ''
  };
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

    assignedSections:
      Array.isArray(profile.assignedSections)
        ? profile.assignedSections
        : [],

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
      cloudUrl: image.cloudUrl
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

    assignedSections:
      Array.isArray(profile.assignedSections)
        ? profile.assignedSections
        : [],

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
      cloudUrl: image.cloudUrl
    },

    avatarDataUrl: image.avatarDataUrl,

    createdAt: profile.createdAt || null,
    updatedAt: profile.updatedAt || null,

    emailVerified: false
  };
}

export function getDisplayName(user) {
  if (!user) {
    return 'Login';
  }

  if (user.role === 'developer') {
    return 'Developer';
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

  // Students and non-students currently use the student dashboard.
  return '/dashboard/student';
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

  return mapUser(credential.user);
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

  if (viewerRole === 'teacher') {
    const assignedGradeLevel =
      String(
        viewer?.assignedGradeLevel || ''
      ).trim();

    const assignedSection =
      String(
        viewer?.assignedSection || ''
      ).trim();

    if (assignedGradeLevel) {
      queryParts.push(
        where(
          'gradeLevel',
          '==',
          assignedGradeLevel
        )
      );
    }

    if (assignedSection) {
      queryParts.push(
        where(
          'section',
          '==',
          assignedSection
        )
      );
    }
  }

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

      // If teacher has school filter and got 0 results, try without schoolId filter
      // to check if students exist but lack schoolId field
      if (
        viewerRole === 'teacher' &&
        useSchoolFilter &&
        results.length === 0
      ) {
        console.log('[JustiFi] No students found with schoolId filter, trying without school filter...');
        
        const fallbackQueryParts = [
          where('role', '==', 'student')
        ];

        const assignedGradeLevel =
          String(
            viewer?.assignedGradeLevel || ''
          ).trim();

        const assignedSection =
          String(
            viewer?.assignedSection || ''
          ).trim();

        if (assignedGradeLevel) {
          fallbackQueryParts.push(
            where(
              'gradeLevel',
              '==',
              assignedGradeLevel
            )
          );
        }

        if (assignedSection) {
          fallbackQueryParts.push(
            where(
              'section',
              '==',
              assignedSection
            )
          );
        }

        const fallbackSnapshot = await getDocs(
          query(
            collection(db, 'users'),
            ...fallbackQueryParts
          )
        );

        const fallbackResults = fallbackSnapshot.docs.map(
          (documentSnapshot) =>
            mapProfileDoc(
              documentSnapshot.id,
              documentSnapshot.data()
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

    if (cursor) {
      queryArgs.push(startAfter(cursor));
    }

    queryArgs.push(limit(pageSize + 1));

    const snapshot = await getDocs(query(...queryArgs));

    const items = snapshot.docs
      .slice(0, pageSize)
      .map((documentSnapshot) =>
        mapProfileDoc(
          documentSnapshot.id,
          documentSnapshot.data()
        )
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
  assignedSection = ''
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

    // Ensure teachers have a schoolId if one is not already set
    if (!documentSnapshot.data()?.schoolId) {
      patch.schoolId = DEFAULT_SCHOOL_ID;
      patch.schoolName = DEFAULT_SCHOOL_NAME;
    }
  } else {
    patch.assignedGradeLevel = '';
    patch.assignedSection = '';
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
