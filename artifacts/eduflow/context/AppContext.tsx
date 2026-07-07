import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type UserRole = "admin" | "teacher";

export interface AppUser {
  id: string;
  name: string;
  role: UserRole;
  centerName?: string;
  phone: string;
  teacherId?: string;
}

export type SalaryType = "fixed" | "percentage";

export interface Teacher {
  id: string;
  name: string;
  phone: string;
  subject: string;
  salaryType: SalaryType;
  salary?: number;
  salaryPercent?: number;
  status: "active" | "inactive";
  joinedAt: string;
}

export interface Student {
  id: string;
  name: string;
  phone: string;
  parentPhone?: string;
  courseId: string;
  groupId: string;
  enrolledAt: string;
  status: "active" | "inactive";
}

export interface Course {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  color: string;
  teacherId?: string;
}

export interface Group {
  id: string;
  name: string;
  courseId: string;
  teacherId: string;
  schedule: string;
  maxStudents: number;
  room?: string;
}

export interface PaymentTransaction {
  id: string;
  amount: number;
  method: "cash" | "card";
  receiptUri?: string;
  paidAt: string;
  note?: string;
}

export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  month: string;
  paidAt?: string;
  status: "paid" | "pending" | "overdue" | "partial";
  note?: string;
  method?: "cash" | "card";
  transactions?: PaymentTransaction[];
  paidTotal?: number;
}

export interface Attendance {
  id: string;
  studentId: string;
  groupId: string;
  date: string;
  status: "present" | "absent" | "late";
}

export type DiscountType = "group" | "individual" | "monthly" | "earlybird" | "registration" | "custom";

export interface Discount {
  id: string;
  name: string;
  type: DiscountType;
  targetId?: string;
  month?: string;
  percent: number;
  durationMonths?: number;
  startDay?: number;
  endDay?: number;
  active: boolean;
  createdAt: string;
}

export interface DiscountRequest {
  id: string;
  teacherId: string;
  targetType: "student" | "group";
  targetId: string;
  period: "monthly" | "unlimited";
  month?: string;
  percent: number;
  description?: string;
  status: "pending" | "approved" | "rejected";
  approvedPercent?: number;
  approvedDurationMonths?: number;
  createdAt: string;
  resolvedAt?: string;
}

interface AppContextType {
  user: AppUser | null;
  setUser: (user: AppUser | null) => void;
  teachers: Teacher[];
  addTeacher: (t: Omit<Teacher, "id" | "joinedAt">) => void;
  updateTeacher: (id: string, data: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => void;
  students: Student[];
  addStudent: (s: Omit<Student, "id" | "enrolledAt">) => void;
  updateStudent: (id: string, data: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  courses: Course[];
  addCourse: (c: Omit<Course, "id">) => void;
  updateCourse: (id: string, data: Partial<Course>) => void;
  deleteCourse: (id: string) => void;
  groups: Group[];
  addGroup: (g: Omit<Group, "id">) => void;
  updateGroup: (id: string, data: Partial<Group>) => void;
  deleteGroup: (id: string) => void;
  payments: Payment[];
  addPayment: (p: Omit<Payment, "id">) => Payment;
  updatePayment: (id: string, data: Partial<Payment>) => void;
  addTransaction: (paymentId: string, tx: Omit<PaymentTransaction, "id">) => void;
  attendances: Attendance[];
  addAttendance: (a: Omit<Attendance, "id">) => void;
  updateAttendance: (id: string, data: Partial<Attendance>) => void;
  discounts: Discount[];
  addDiscount: (d: Omit<Discount, "id" | "createdAt">) => void;
  updateDiscount: (id: string, data: Partial<Discount>) => void;
  deleteDiscount: (id: string) => void;
  discountRequests: DiscountRequest[];
  addDiscountRequest: (r: Omit<DiscountRequest, "id" | "createdAt" | "status">) => void;
  resolveDiscountRequest: (id: string, resolution: { status: "approved" | "rejected"; approvedPercent?: number; approvedDurationMonths?: number }) => void;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = "eduflow_data_v4";

function genId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

const SAMPLE_TEACHERS: Teacher[] = [
  { id: "t1", name: "Rahimov Bobur", phone: "+998901110001", subject: "Matematika", salaryType: "fixed", salary: 2000000, status: "active", joinedAt: "2025-09-01" },
  { id: "t2", name: "Yusupova Dilnoza", phone: "+998901110002", subject: "Ingliz tili", salaryType: "percentage", salaryPercent: 40, status: "active", joinedAt: "2025-10-01" },
];

const SAMPLE_COURSES: Course[] = [
  { id: "c1", name: "Matematika", description: "Umumiy matematik kurs", price: 350000, duration: 3, color: "#1E3A8A", teacherId: "t1" },
  { id: "c2", name: "Ingliz tili", description: "Ingliz tili kursi", price: 450000, duration: 3, color: "#7C3AED", teacherId: "t2" },
  { id: "c3", name: "Dasturlash", description: "Python va Web dasturlash", price: 600000, duration: 6, color: "#10B981" },
];

const SAMPLE_GROUPS: Group[] = [
  { id: "g1", name: "Mat-A", courseId: "c1", teacherId: "t1", schedule: "Du-Cho-Ju, 09:00", maxStudents: 15, room: "204-xona" },
  { id: "g2", name: "Ingliz-B1", courseId: "c2", teacherId: "t2", schedule: "Se-Sha-Yak, 11:00", maxStudents: 12, room: "101-xona" },
];

const SAMPLE_STUDENTS: Student[] = [
  { id: "s1", name: "Aliyev Sardor", phone: "+998901234567", courseId: "c1", groupId: "g1", enrolledAt: "2026-01-15", status: "active" },
  { id: "s2", name: "Karimova Zilola", phone: "+998901234568", courseId: "c2", groupId: "g2", enrolledAt: "2026-01-20", status: "active" },
  { id: "s3", name: "Toshmatov Jasur", phone: "+998901234569", courseId: "c1", groupId: "g1", enrolledAt: "2026-02-01", status: "active" },
  { id: "s4", name: "Nazarova Munira", phone: "+998901234570", courseId: "c3", groupId: "g1", enrolledAt: "2026-02-10", status: "inactive" },
];

const SAMPLE_PAYMENTS: Payment[] = [
  { id: "p1", studentId: "s1", amount: 350000, month: "2026-07", paidAt: "2026-07-01", status: "paid", method: "cash", transactions: [{ id: "tx1", amount: 350000, method: "cash", paidAt: "2026-07-01" }], paidTotal: 350000 },
  { id: "p2", studentId: "s2", amount: 450000, month: "2026-07", status: "pending", paidTotal: 0 },
  { id: "p3", studentId: "s3", amount: 350000, month: "2026-07", status: "overdue", paidTotal: 0 },
  { id: "p4", studentId: "s1", amount: 350000, month: "2026-06", paidAt: "2026-06-02", status: "paid", method: "cash", transactions: [{ id: "tx2", amount: 350000, method: "cash", paidAt: "2026-06-02" }], paidTotal: 350000 },
];

const SAMPLE_DISCOUNTS: Discount[] = [
  { id: "d1", name: "Erta to'lov (1–10 kun)", type: "earlybird", percent: 10, startDay: 1, endDay: 10, active: true, createdAt: "2026-01-01" },
  { id: "d2", name: "Erta to'lov (11–15 kun)", type: "earlybird", percent: 5, startDay: 11, endDay: 15, active: true, createdAt: "2026-01-01" },
  { id: "d3", name: "Ro'yxatdan o'tish chegirmasi", type: "registration", percent: 20, durationMonths: 1, active: true, createdAt: "2026-01-01" },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AppUser | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [discountRequests, setDiscountRequests] = useState<DiscountRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.user) setUserState(data.user);
        setTeachers(data.teachers ?? SAMPLE_TEACHERS);
        setStudents(data.students ?? SAMPLE_STUDENTS);
        setCourses(data.courses ?? SAMPLE_COURSES);
        setGroups(data.groups ?? SAMPLE_GROUPS);
        setPayments(data.payments ?? SAMPLE_PAYMENTS);
        setAttendances(data.attendances ?? []);
        setDiscounts(data.discounts ?? SAMPLE_DISCOUNTS);
        setDiscountRequests(data.discountRequests ?? []);
      } else {
        setTeachers(SAMPLE_TEACHERS);
        setStudents(SAMPLE_STUDENTS);
        setCourses(SAMPLE_COURSES);
        setGroups(SAMPLE_GROUPS);
        setPayments(SAMPLE_PAYMENTS);
        setDiscounts(SAMPLE_DISCOUNTS);
      }
    } catch {
      setTeachers(SAMPLE_TEACHERS);
      setStudents(SAMPLE_STUDENTS);
      setCourses(SAMPLE_COURSES);
      setGroups(SAMPLE_GROUPS);
      setPayments(SAMPLE_PAYMENTS);
      setDiscounts(SAMPLE_DISCOUNTS);
    } finally {
      setIsLoading(false);
    }
  };

  const persist = useCallback(async (updates: {
    user?: AppUser | null;
    teachers?: Teacher[];
    students?: Student[];
    courses?: Course[];
    groups?: Group[];
    payments?: Payment[];
    attendances?: Attendance[];
    discounts?: Discount[];
    discountRequests?: DiscountRequest[];
  }) => {
    try {
      const current = await AsyncStorage.getItem(STORAGE_KEY);
      const existing = current ? JSON.parse(current) : {};
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...updates }));
    } catch {}
  }, []);

  const setUser = useCallback((u: AppUser | null) => {
    setUserState(u);
    persist({ user: u });
  }, [persist]);

  const addTeacher = useCallback((t: Omit<Teacher, "id" | "joinedAt">) => {
    const newT: Teacher = { ...t, id: genId(), joinedAt: new Date().toISOString().split("T")[0] };
    setTeachers(prev => { const next = [...prev, newT]; persist({ teachers: next }); return next; });
  }, [persist]);

  const updateTeacher = useCallback((id: string, data: Partial<Teacher>) => {
    setTeachers(prev => { const next = prev.map(t => t.id === id ? { ...t, ...data } : t); persist({ teachers: next }); return next; });
  }, [persist]);

  const deleteTeacher = useCallback((id: string) => {
    setTeachers(prev => { const next = prev.filter(t => t.id !== id); persist({ teachers: next }); return next; });
  }, [persist]);

  const addStudent = useCallback((s: Omit<Student, "id" | "enrolledAt">) => {
    const newS: Student = { ...s, id: genId(), enrolledAt: new Date().toISOString().split("T")[0] };
    setStudents(prev => { const next = [...prev, newS]; persist({ students: next }); return next; });
  }, [persist]);

  const updateStudent = useCallback((id: string, data: Partial<Student>) => {
    setStudents(prev => { const next = prev.map(s => s.id === id ? { ...s, ...data } : s); persist({ students: next }); return next; });
  }, [persist]);

  const deleteStudent = useCallback((id: string) => {
    setStudents(prev => { const next = prev.filter(s => s.id !== id); persist({ students: next }); return next; });
  }, [persist]);

  const addCourse = useCallback((c: Omit<Course, "id">) => {
    const newC: Course = { ...c, id: genId() };
    setCourses(prev => { const next = [...prev, newC]; persist({ courses: next }); return next; });
  }, [persist]);

  const updateCourse = useCallback((id: string, data: Partial<Course>) => {
    setCourses(prev => { const next = prev.map(c => c.id === id ? { ...c, ...data } : c); persist({ courses: next }); return next; });
  }, [persist]);

  const deleteCourse = useCallback((id: string) => {
    setCourses(prev => { const next = prev.filter(c => c.id !== id); persist({ courses: next }); return next; });
  }, [persist]);

  const addGroup = useCallback((g: Omit<Group, "id">) => {
    const newG: Group = { ...g, id: genId() };
    setGroups(prev => { const next = [...prev, newG]; persist({ groups: next }); return next; });
  }, [persist]);

  const updateGroup = useCallback((id: string, data: Partial<Group>) => {
    setGroups(prev => { const next = prev.map(g => g.id === id ? { ...g, ...data } : g); persist({ groups: next }); return next; });
  }, [persist]);

  const deleteGroup = useCallback((id: string) => {
    setGroups(prev => { const next = prev.filter(g => g.id !== id); persist({ groups: next }); return next; });
  }, [persist]);

  const addPayment = useCallback((p: Omit<Payment, "id">): Payment => {
    const newP: Payment = { ...p, id: genId(), paidTotal: p.paidTotal ?? 0, transactions: p.transactions ?? [] };
    setPayments(prev => { const next = [...prev, newP]; persist({ payments: next }); return next; });
    return newP;
  }, [persist]);

  const updatePayment = useCallback((id: string, data: Partial<Payment>) => {
    setPayments(prev => { const next = prev.map(p => p.id === id ? { ...p, ...data } : p); persist({ payments: next }); return next; });
  }, [persist]);

  const addTransaction = useCallback((paymentId: string, tx: Omit<PaymentTransaction, "id">) => {
    const newTx: PaymentTransaction = { ...tx, id: genId() };
    setPayments(prev => {
      const next = prev.map(p => {
        if (p.id !== paymentId) return p;
        const txs = [...(p.transactions ?? []), newTx];
        const paidTotal = txs.reduce((s, t) => s + t.amount, 0);
        const status: Payment["status"] = paidTotal >= p.amount ? "paid" : paidTotal > 0 ? "partial" : p.status;
        const paidAt = paidTotal >= p.amount ? newTx.paidAt : p.paidAt;
        return { ...p, transactions: txs, paidTotal, status, paidAt };
      });
      persist({ payments: next });
      return next;
    });
  }, [persist]);

  const addAttendance = useCallback((a: Omit<Attendance, "id">) => {
    const newA: Attendance = { ...a, id: genId() };
    setAttendances(prev => { const next = [...prev, newA]; persist({ attendances: next }); return next; });
  }, [persist]);

  const updateAttendance = useCallback((id: string, data: Partial<Attendance>) => {
    setAttendances(prev => { const next = prev.map(a => a.id === id ? { ...a, ...data } : a); persist({ attendances: next }); return next; });
  }, [persist]);

  const addDiscount = useCallback((d: Omit<Discount, "id" | "createdAt">) => {
    const newD: Discount = { ...d, id: genId(), createdAt: new Date().toISOString().split("T")[0] };
    setDiscounts(prev => { const next = [...prev, newD]; persist({ discounts: next }); return next; });
  }, [persist]);

  const updateDiscount = useCallback((id: string, data: Partial<Discount>) => {
    setDiscounts(prev => { const next = prev.map(d => d.id === id ? { ...d, ...data } : d); persist({ discounts: next }); return next; });
  }, [persist]);

  const deleteDiscount = useCallback((id: string) => {
    setDiscounts(prev => { const next = prev.filter(d => d.id !== id); persist({ discounts: next }); return next; });
  }, [persist]);

  const addDiscountRequest = useCallback((r: Omit<DiscountRequest, "id" | "createdAt" | "status">) => {
    const newR: DiscountRequest = { ...r, id: genId(), status: "pending", createdAt: new Date().toISOString().split("T")[0] };
    setDiscountRequests(prev => { const next = [...prev, newR]; persist({ discountRequests: next }); return next; });
  }, [persist]);

  const resolveDiscountRequest = useCallback((id: string, resolution: { status: "approved" | "rejected"; approvedPercent?: number; approvedDurationMonths?: number }) => {
    setDiscountRequests(prev => {
      const next = prev.map(r => r.id === id ? { ...r, ...resolution, resolvedAt: new Date().toISOString().split("T")[0] } : r);
      persist({ discountRequests: next });
      return next;
    });
  }, [persist]);

  return (
    <AppContext.Provider value={{
      user, setUser,
      teachers, addTeacher, updateTeacher, deleteTeacher,
      students, addStudent, updateStudent, deleteStudent,
      courses, addCourse, updateCourse, deleteCourse,
      groups, addGroup, updateGroup, deleteGroup,
      payments, addPayment, updatePayment, addTransaction,
      attendances, addAttendance, updateAttendance,
      discounts, addDiscount, updateDiscount, deleteDiscount,
      discountRequests, addDiscountRequest, resolveDiscountRequest,
      isLoading,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
