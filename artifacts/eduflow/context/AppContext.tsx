import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth, type AuthUser } from "@/context/AuthContext";

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
  addTeacher: (t: Omit<Teacher, "id" | "joinedAt">, pin?: string) => Promise<void>;
  updateTeacher: (id: string, data: Partial<Teacher>, pin?: string) => Promise<void>;
  deleteTeacher: (id: string) => Promise<void>;
  students: Student[];
  addStudent: (s: Omit<Student, "id" | "enrolledAt">) => Promise<void>;
  addStudentsBulk: (list: Omit<Student, "id" | "enrolledAt">[]) => Promise<number>;
  updateStudent: (id: string, data: Partial<Student>) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  courses: Course[];
  addCourse: (c: Omit<Course, "id">) => Promise<void>;
  updateCourse: (id: string, data: Partial<Course>) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  groups: Group[];
  addGroup: (g: Omit<Group, "id">) => Promise<void>;
  updateGroup: (id: string, data: Partial<Group>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  payments: Payment[];
  addPayment: (p: Omit<Payment, "id">) => Promise<Payment>;
  updatePayment: (id: string, data: Partial<Payment>) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
  addTransaction: (paymentId: string, tx: Omit<PaymentTransaction, "id">) => Promise<void>;
  attendances: Attendance[];
  addAttendance: (a: Omit<Attendance, "id">) => Promise<void>;
  updateAttendance: (id: string, data: Partial<Attendance>) => Promise<void>;
  discounts: Discount[];
  addDiscount: (d: Omit<Discount, "id" | "createdAt">) => Promise<void>;
  updateDiscount: (id: string, data: Partial<Discount>) => Promise<void>;
  deleteDiscount: (id: string) => Promise<void>;
  discountRequests: DiscountRequest[];
  addDiscountRequest: (r: Omit<DiscountRequest, "id" | "createdAt" | "status">) => Promise<void>;
  resolveDiscountRequest: (id: string, resolution: { status: "approved" | "rejected"; approvedPercent?: number; approvedDurationMonths?: number }) => Promise<void>;
  isLoading: boolean;
  refreshAll: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

function genId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

// Map DB row → Teacher
function dbToTeacher(r: any): Teacher {
  return {
    id: r.id, name: r.name, phone: r.phone, subject: r.subject,
    salaryType: r.salary_type as SalaryType,
    salary: r.salary ?? undefined,
    salaryPercent: r.salary_percent ?? undefined,
    status: r.status as "active" | "inactive",
    joinedAt: r.joined_at,
  };
}

function dbToStudent(r: any): Student {
  return {
    id: r.id, name: r.name, phone: r.phone,
    parentPhone: r.parent_phone ?? undefined,
    courseId: r.course_id, groupId: r.group_id,
    enrolledAt: r.enrolled_at,
    status: r.status as "active" | "inactive",
  };
}

function dbToCourse(r: any): Course {
  return {
    id: r.id, name: r.name,
    description: r.description ?? undefined,
    price: r.price, duration: r.duration, color: r.color,
    teacherId: r.teacher_id ?? undefined,
  };
}

function dbToGroup(r: any): Group {
  return {
    id: r.id, name: r.name,
    courseId: r.course_id, teacherId: r.teacher_id,
    schedule: r.schedule, maxStudents: r.max_students,
    room: r.room ?? undefined,
  };
}

function dbToPayment(r: any, txRows: any[]): Payment {
  const txs = txRows.filter(t => t.payment_id === r.id).map(t => ({
    id: t.id, amount: t.amount, method: t.method as "cash" | "card",
    receiptUri: t.receipt_uri ?? undefined,
    paidAt: t.paid_at, note: t.note ?? undefined,
  }));
  return {
    id: r.id, studentId: r.student_id, amount: r.amount,
    month: r.month, paidAt: r.paid_at ?? undefined,
    status: r.status as Payment["status"],
    note: r.note ?? undefined, method: r.method ?? undefined,
    paidTotal: r.paid_total ?? 0,
    transactions: txs,
  };
}

function dbToAttendance(r: any): Attendance {
  return { id: r.id, studentId: r.student_id, groupId: r.group_id, date: r.date, status: r.status as Attendance["status"] };
}

function dbToDiscount(r: any): Discount {
  return {
    id: r.id, name: r.name, type: r.type as DiscountType,
    targetId: r.target_id ?? undefined, month: r.month ?? undefined,
    percent: r.percent, durationMonths: r.duration_months ?? undefined,
    startDay: r.start_day ?? undefined, endDay: r.end_day ?? undefined,
    active: r.active, createdAt: r.created_at,
  };
}

function dbToDiscountRequest(r: any): DiscountRequest {
  return {
    id: r.id, teacherId: r.teacher_id,
    targetType: r.target_type as "student" | "group",
    targetId: r.target_id, period: r.period as "monthly" | "unlimited",
    month: r.month ?? undefined, percent: r.percent,
    description: r.description ?? undefined,
    status: r.status as DiscountRequest["status"],
    approvedPercent: r.approved_percent ?? undefined,
    approvedDurationMonths: r.approved_duration_months ?? undefined,
    createdAt: r.created_at, resolvedAt: r.resolved_at ?? undefined,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { authUser } = useAuth();

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

  useEffect(() => {
    if (authUser) {
      const u: AppUser = {
        id: authUser.id, name: authUser.name, role: authUser.role,
        phone: authUser.phone, teacherId: authUser.teacherId,
        centerName: authUser.centerName,
      };
      setUserState(u);
      loadAll();
    } else {
      setUserState(null);
      setIsLoading(false);
    }
  }, [authUser]);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [
        { data: tRows }, { data: cRows }, { data: gRows },
        { data: sRows }, { data: pRows }, { data: txRows },
        { data: aRows }, { data: dRows }, { data: drRows },
      ] = await Promise.all([
        supabase.from("teachers").select("*").order("created_at"),
        supabase.from("courses").select("*").order("created_at"),
        supabase.from("groups").select("*").order("created_at"),
        supabase.from("students").select("*").order("created_at"),
        supabase.from("payments").select("*").order("created_at"),
        supabase.from("payment_transactions").select("*").order("created_at"),
        supabase.from("attendances").select("*").order("date"),
        supabase.from("discounts").select("*").order("created_at"),
        supabase.from("discount_requests").select("*").order("created_at"),
      ]);

      setTeachers((tRows ?? []).map(dbToTeacher));
      setCourses((cRows ?? []).map(dbToCourse));
      setGroups((gRows ?? []).map(dbToGroup));
      setStudents((sRows ?? []).map(dbToStudent));
      const allTx = txRows ?? [];
      setPayments((pRows ?? []).map(r => dbToPayment(r, allTx)));
      setAttendances((aRows ?? []).map(dbToAttendance));
      setDiscounts((dRows ?? []).map(dbToDiscount));
      setDiscountRequests((drRows ?? []).map(dbToDiscountRequest));
    } catch (e) {
      console.error("loadAll error", e);
    } finally {
      setIsLoading(false);
    }
  };

  const setUser = useCallback((u: AppUser | null) => { setUserState(u); }, []);

  const addTeacher = useCallback(async (t: Omit<Teacher, "id" | "joinedAt">, pin?: string) => {
    const row: any = {
      id: genId(), name: t.name, phone: t.phone, subject: t.subject,
      salary_type: t.salaryType, salary: t.salary ?? null,
      salary_percent: t.salaryPercent ?? null, status: t.status,
      joined_at: new Date().toISOString().split("T")[0],
    };
    if (pin) row.pin_hash = hashPin(pin);
    const { data, error } = await supabase.from("teachers").insert(row).select().single();
    if (!error && data) setTeachers(prev => [...prev, dbToTeacher(data)]);
  }, []);

  const updateTeacher = useCallback(async (id: string, data: Partial<Teacher>, pin?: string) => {
    const row: any = {};
    if (data.name !== undefined) row.name = data.name;
    if (data.phone !== undefined) row.phone = data.phone;
    if (data.subject !== undefined) row.subject = data.subject;
    if (data.salaryType !== undefined) row.salary_type = data.salaryType;
    if (data.salary !== undefined) row.salary = data.salary;
    if (data.salaryPercent !== undefined) row.salary_percent = data.salaryPercent;
    if (data.status !== undefined) row.status = data.status;
    if (pin) row.pin_hash = hashPin(pin);
    const { data: updated } = await supabase.from("teachers").update(row).eq("id", id).select().single();
    if (updated) setTeachers(prev => prev.map(t => t.id === id ? dbToTeacher(updated) : t));
  }, []);

  const deleteTeacher = useCallback(async (id: string) => {
    await supabase.from("teachers").delete().eq("id", id);
    setTeachers(prev => prev.filter(t => t.id !== id));
  }, []);

  const addStudent = useCallback(async (s: Omit<Student, "id" | "enrolledAt">) => {
    const row = {
      id: genId(), name: s.name, phone: s.phone,
      parent_phone: s.parentPhone ?? null,
      course_id: s.courseId, group_id: s.groupId, status: s.status,
      enrolled_at: new Date().toISOString().split("T")[0],
    };
    const { data, error } = await supabase.from("students").insert(row).select().single();
    if (!error && data) setStudents(prev => [...prev, dbToStudent(data)]);
  }, []);

  const addStudentsBulk = useCallback(async (list: Omit<Student, "id" | "enrolledAt">[]): Promise<number> => {
    if (list.length === 0) return 0;
    const today = new Date().toISOString().split("T")[0];
    const rows = list.map(s => ({
      id: genId(), name: s.name, phone: s.phone,
      parent_phone: s.parentPhone ?? null,
      course_id: s.courseId, group_id: s.groupId, status: s.status,
      enrolled_at: today,
    }));
    const { data, error } = await supabase.from("students").insert(rows).select();
    if (error || !data) throw new Error(error?.message ?? "O'quvchilar qo'shilmadi");
    setStudents(prev => [...prev, ...data.map(dbToStudent)]);
    return data.length;
  }, []);

  const updateStudent = useCallback(async (id: string, data: Partial<Student>) => {
    const row: any = {};
    if (data.name !== undefined) row.name = data.name;
    if (data.phone !== undefined) row.phone = data.phone;
    if (data.parentPhone !== undefined) row.parent_phone = data.parentPhone;
    if (data.courseId !== undefined) row.course_id = data.courseId;
    if (data.groupId !== undefined) row.group_id = data.groupId;
    if (data.status !== undefined) row.status = data.status;
    const { data: updated } = await supabase.from("students").update(row).eq("id", id).select().single();
    if (updated) setStudents(prev => prev.map(s => s.id === id ? dbToStudent(updated) : s));
  }, []);

  const deleteStudent = useCallback(async (id: string) => {
    await supabase.from("students").delete().eq("id", id);
    setStudents(prev => prev.filter(s => s.id !== id));
  }, []);

  const addCourse = useCallback(async (c: Omit<Course, "id">) => {
    const row = {
      id: genId(), name: c.name, description: c.description ?? null,
      price: c.price, duration: c.duration, color: c.color,
      teacher_id: c.teacherId ?? null,
    };
    const { data, error } = await supabase.from("courses").insert(row).select().single();
    if (!error && data) setCourses(prev => [...prev, dbToCourse(data)]);
  }, []);

  const updateCourse = useCallback(async (id: string, data: Partial<Course>) => {
    const row: any = {};
    if (data.name !== undefined) row.name = data.name;
    if (data.description !== undefined) row.description = data.description;
    if (data.price !== undefined) row.price = data.price;
    if (data.duration !== undefined) row.duration = data.duration;
    if (data.color !== undefined) row.color = data.color;
    if (data.teacherId !== undefined) row.teacher_id = data.teacherId;
    const { data: updated } = await supabase.from("courses").update(row).eq("id", id).select().single();
    if (updated) setCourses(prev => prev.map(c => c.id === id ? dbToCourse(updated) : c));
  }, []);

  const deleteCourse = useCallback(async (id: string) => {
    await supabase.from("courses").delete().eq("id", id);
    setCourses(prev => prev.filter(c => c.id !== id));
  }, []);

  const addGroup = useCallback(async (g: Omit<Group, "id">) => {
    const row = {
      id: genId(), name: g.name, course_id: g.courseId,
      teacher_id: g.teacherId, schedule: g.schedule,
      max_students: g.maxStudents, room: g.room ?? null,
    };
    const { data, error } = await supabase.from("groups").insert(row).select().single();
    if (!error && data) setGroups(prev => [...prev, dbToGroup(data)]);
  }, []);

  const updateGroup = useCallback(async (id: string, data: Partial<Group>) => {
    const row: any = {};
    if (data.name !== undefined) row.name = data.name;
    if (data.courseId !== undefined) row.course_id = data.courseId;
    if (data.teacherId !== undefined) row.teacher_id = data.teacherId;
    if (data.schedule !== undefined) row.schedule = data.schedule;
    if (data.maxStudents !== undefined) row.max_students = data.maxStudents;
    if (data.room !== undefined) row.room = data.room;
    const { data: updated } = await supabase.from("groups").update(row).eq("id", id).select().single();
    if (updated) setGroups(prev => prev.map(g => g.id === id ? dbToGroup(updated) : g));
  }, []);

  const deleteGroup = useCallback(async (id: string) => {
    await supabase.from("groups").delete().eq("id", id);
    setGroups(prev => prev.filter(g => g.id !== id));
  }, []);

  const addPayment = useCallback(async (p: Omit<Payment, "id">): Promise<Payment> => {
    const id = genId();
    const row = {
      id, student_id: p.studentId, amount: p.amount, month: p.month,
      paid_at: p.paidAt ?? null, status: p.status,
      note: p.note ?? null, method: p.method ?? null,
      paid_total: p.paidTotal ?? 0,
    };
    const { data, error } = await supabase.from("payments").insert(row).select().single();
    if (error || !data) throw new Error(error?.message ?? "To'lov qo'shilmadi");

    const txs = p.transactions ?? [];
    let savedTxs: PaymentTransaction[] = [];
    if (txs.length > 0) {
      const txRows = txs.map(tx => ({
        id: genId(), payment_id: id, amount: tx.amount,
        method: tx.method, paid_at: tx.paidAt, note: tx.note ?? null,
      }));
      const { data: txData } = await supabase.from("payment_transactions").insert(txRows).select();
      savedTxs = (txData ?? []).map(t => ({
        id: t.id, amount: t.amount, method: t.method as "cash" | "card",
        paidAt: t.paid_at, note: t.note ?? undefined,
      }));
    }

    const newP = dbToPayment(data, savedTxs.map(tx => ({ ...tx, payment_id: id, paid_at: tx.paidAt, receipt_uri: tx.receiptUri })));
    newP.transactions = savedTxs;
    setPayments(prev => [...prev, newP]);
    return newP;
  }, []);

  const updatePayment = useCallback(async (id: string, data: Partial<Payment>) => {
    const row: any = {};
    if (data.status !== undefined) row.status = data.status;
    if (data.paidAt !== undefined) row.paid_at = data.paidAt;
    if (data.paidTotal !== undefined) row.paid_total = data.paidTotal;
    if (data.note !== undefined) row.note = data.note;
    const { data: updated } = await supabase.from("payments").update(row).eq("id", id).select().single();
    if (updated) {
      setPayments(prev => prev.map(p => {
        if (p.id !== id) return p;
        return { ...p, ...data };
      }));
    }
  }, []);

  const deletePayment = useCallback(async (id: string) => {
    const { error: txError } = await supabase.from("payment_transactions").delete().eq("payment_id", id);
    if (txError) throw new Error(txError.message);
    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (error) throw new Error(error.message);
    setPayments(prev => prev.filter(p => p.id !== id));
  }, []);

  const addTransaction = useCallback(async (paymentId: string, tx: Omit<PaymentTransaction, "id">) => {
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;

    const txRow = {
      id: genId(), payment_id: paymentId,
      amount: tx.amount, method: tx.method,
      receipt_uri: tx.receiptUri ?? null,
      paid_at: tx.paidAt, note: tx.note ?? null,
    };
    const { data: txData } = await supabase.from("payment_transactions").insert(txRow).select().single();

    const newTx: PaymentTransaction = {
      id: txData?.id ?? genId(), amount: tx.amount, method: tx.method,
      receiptUri: tx.receiptUri, paidAt: tx.paidAt, note: tx.note,
    };
    const allTxs = [...(payment.transactions ?? []), newTx];
    const paidTotal = allTxs.reduce((s, t) => s + t.amount, 0);
    const status: Payment["status"] = paidTotal >= payment.amount ? "paid" : paidTotal > 0 ? "partial" : payment.status;
    const paidAt = paidTotal >= payment.amount ? tx.paidAt : payment.paidAt;

    await supabase.from("payments").update({ paid_total: paidTotal, status, paid_at: paidAt ?? null }).eq("id", paymentId);
    setPayments(prev => prev.map(p => p.id === paymentId
      ? { ...p, transactions: allTxs, paidTotal, status, paidAt }
      : p
    ));
  }, [payments]);

  const addAttendance = useCallback(async (a: Omit<Attendance, "id">) => {
    const row = { id: genId(), student_id: a.studentId, group_id: a.groupId, date: a.date, status: a.status };
    const { data } = await supabase.from("attendances").insert(row).select().single();
    if (data) setAttendances(prev => [...prev, dbToAttendance(data)]);
  }, []);

  const updateAttendance = useCallback(async (id: string, data: Partial<Attendance>) => {
    const row: any = {};
    if (data.status !== undefined) row.status = data.status;
    await supabase.from("attendances").update(row).eq("id", id);
    setAttendances(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
  }, []);

  const addDiscount = useCallback(async (d: Omit<Discount, "id" | "createdAt">) => {
    const row = {
      id: genId(), name: d.name, type: d.type,
      target_id: d.targetId ?? null, month: d.month ?? null,
      percent: d.percent, duration_months: d.durationMonths ?? null,
      start_day: d.startDay ?? null, end_day: d.endDay ?? null,
      active: d.active,
    };
    const { data } = await supabase.from("discounts").insert(row).select().single();
    if (data) setDiscounts(prev => [...prev, dbToDiscount(data)]);
  }, []);

  const updateDiscount = useCallback(async (id: string, data: Partial<Discount>) => {
    const row: any = {};
    if (data.name !== undefined) row.name = data.name;
    if (data.active !== undefined) row.active = data.active;
    if (data.percent !== undefined) row.percent = data.percent;
    await supabase.from("discounts").update(row).eq("id", id);
    setDiscounts(prev => prev.map(d => d.id === id ? { ...d, ...data } : d));
  }, []);

  const deleteDiscount = useCallback(async (id: string) => {
    await supabase.from("discounts").delete().eq("id", id);
    setDiscounts(prev => prev.filter(d => d.id !== id));
  }, []);

  const addDiscountRequest = useCallback(async (r: Omit<DiscountRequest, "id" | "createdAt" | "status">) => {
    const row = {
      id: genId(), teacher_id: r.teacherId,
      target_type: r.targetType, target_id: r.targetId,
      period: r.period, month: r.month ?? null,
      percent: r.percent, description: r.description ?? null,
      status: "pending",
    };
    const { data } = await supabase.from("discount_requests").insert(row).select().single();
    if (data) setDiscountRequests(prev => [...prev, dbToDiscountRequest(data)]);
  }, []);

  const resolveDiscountRequest = useCallback(async (id: string, resolution: { status: "approved" | "rejected"; approvedPercent?: number; approvedDurationMonths?: number }) => {
    const row: any = {
      status: resolution.status,
      resolved_at: new Date().toISOString(),
      approved_percent: resolution.approvedPercent ?? null,
      approved_duration_months: resolution.approvedDurationMonths ?? null,
    };
    await supabase.from("discount_requests").update(row).eq("id", id);
    setDiscountRequests(prev => prev.map(r => r.id === id ? { ...r, ...resolution, resolvedAt: new Date().toISOString().split("T")[0] } : r));
  }, []);

  const refreshAll = useCallback(async () => { await loadAll(); }, []);

  return (
    <AppContext.Provider value={{
      user, setUser,
      teachers, addTeacher, updateTeacher, deleteTeacher,
      students, addStudent, addStudentsBulk, updateStudent, deleteStudent,
      courses, addCourse, updateCourse, deleteCourse,
      groups, addGroup, updateGroup, deleteGroup,
      payments, addPayment, updatePayment, deletePayment, addTransaction,
      attendances, addAttendance, updateAttendance,
      discounts, addDiscount, updateDiscount, deleteDiscount,
      discountRequests, addDiscountRequest, resolveDiscountRequest,
      isLoading, refreshAll,
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
