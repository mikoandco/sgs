// ============================================
// User & Auth Types
// ============================================

export type UserRole = 'ADMIN' | 'DIRECTION' | 'COMMERCIAL' | 'SDR';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  active: boolean;
  teamId?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// ============================================
// Prospect Types
// ============================================

export type ProspectStatus =
  | 'NEW'
  | 'QUALIFYING'
  | 'QUALIFIED'
  | 'APPOINTMENT_SCHEDULED'
  | 'APPOINTMENT_DONE'
  | 'QUOTE_SENT'
  | 'SIGNED'
  | 'INSTALLATION_PENDING'
  | 'INSTALLED'
  | 'LOST';

export type ProspectNeed = 'SECURITY' | 'DISPLAY' | 'MIXED';

export interface Prospect {
  id: string;
  status: ProspectStatus;
  need?: ProspectNeed;
  companyName: string;
  address: string;
  addressComplement?: string;
  postalCode: string;
  city: string;
  country: string;
  lat?: number;
  lng?: number;
  phone?: string;
  siret?: string;
  activitySector?: string;
  decisionMakerName: string;
  decisionMakerFunction?: string;
  decisionMakerMobile: string;
  decisionMakerEmail?: string;
  hasAssociate: boolean;
  associateName?: string;
  associatePhone?: string;
  qualificationScore?: number;
  isTabacSubvention: boolean;
  subventionAmount?: number;
  subventionStatus?: string;
  isReferred: boolean;
  referredById?: string;
  referredBy?: Prospect;
  referrals?: Prospect[];
  sdrId?: string;
  sdr?: User;
  commercialId?: string;
  commercial?: User;
  createdAt: string;
  updatedAt: string;
  qualifiedAt?: string;
  signedAt?: string;
  installedAt?: string;
  qualificationAnswers?: QualificationAnswer[];
  appointments?: Appointment[];
  quotes?: Quote[];
  timelineEntries?: TimelineEntry[];
  alerts?: Alert[];
  contracts?: Contract[];
  salesPhases?: SalesPhase[];
}

// ============================================
// Qualification Types
// ============================================

export type QuestionType = 'YES_NO' | 'MULTIPLE_CHOICE' | 'TEXT' | 'NUMBER' | 'SCALE';
export type QuestionCategory = 'SECURITY' | 'DISPLAY';

export interface QualificationQuestion {
  id: string;
  text: string;
  type: QuestionType;
  category: QuestionCategory;
  parentId?: string;
  children?: QualificationQuestion[];
  displayCondition?: string;
  displayOrder: number;
  required: boolean;
  active: boolean;
  options?: string;
}

export interface QualificationAnswer {
  id: string;
  prospectId: string;
  questionId: string;
  question?: QualificationQuestion;
  answer: string;
}

// ============================================
// Appointment Types
// ============================================

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'RESCHEDULED';

export interface Appointment {
  id: string;
  prospectId: string;
  prospect?: Prospect;
  sdrId?: string;
  sdr?: User;
  commercialId: string;
  commercial?: User;
  scheduledAt: string;
  duration: number;
  status: AppointmentStatus;
  notes?: string;
  cancelReason?: string;
  createdAt: string;
}

// ============================================
// Product & Catalog Types
// ============================================

export type ProductFamily = 'SECURITY' | 'MAINTENANCE' | 'DISPLAY' | 'WORKS';

export interface Product {
  id: string;
  reference: string;
  name: string;
  family: ProductFamily;
  unitPriceHT: number;
  purchasePrice?: number;
  unit: string;
  laborHours?: number;
  active: boolean;
}

export interface Kit {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  items: KitItem[];
}

export interface KitItem {
  id: string;
  kitId: string;
  productId: string;
  product?: Product;
  quantity: number;
}

// ============================================
// Quote Types
// ============================================

export type QuoteStatus = 'DRAFT' | 'SENT' | 'SIGNED' | 'VALIDATED' | 'REFUSED' | 'EXPIRED';
export type PaymentMode = 'CASH' | 'LEASING';
export type LeasingOrganism = 'GRENKE' | 'LOCAM' | 'OTHER';

export interface Quote {
  id: string;
  quoteNumber: string;
  prospectId: string;
  prospect?: Prospect;
  commercialId: string;
  commercial?: User;
  status: QuoteStatus;
  validUntil: string;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  marginPercent?: number;
  discountPercent?: number;
  discountAmount?: number;
  paymentMode?: PaymentMode;
  depositPercent?: number;
  depositAmount?: number;
  checkNumber?: string;
  checkPhotoUrl?: string;
  leasingOrganism?: LeasingOrganism;
  leasingDuration?: number;
  monthlyPayment?: number;
  isTabacSubvention: boolean;
  eligibleAmount?: number;
  clientSignatureUrl?: string;
  commercialSignatureUrl?: string;
  signedAt?: string;
  pdfUrl?: string;
  phase?: number;
  linkedQuoteId?: string;
  createdAt: string;
  updatedAt: string;
  lines?: QuoteLine[];
  upsells?: QuoteUpsell[];
  payments?: Payment[];
  validations?: Validation[];
}

export interface QuoteLine {
  id: string;
  quoteId: string;
  productId: string;
  product?: Product;
  designation: string;
  quantity: number;
  unitPriceHT: number;
  totalHT: number;
  laborHours?: number;
  sortOrder: number;
}

export interface QuoteUpsell {
  id: string;
  quoteId: string;
  name: string;
  description?: string;
  priceHT: number;
  isMonthly: boolean;
  selected: boolean;
}

// ============================================
// Payment & Validation Types
// ============================================

export type PaymentStatus = 'PENDING' | 'RECEIVED' | 'VALIDATED' | 'REJECTED';
export type ValidationStatus = 'PENDING' | 'APPROVED' | 'REFUSED' | 'INFO_REQUESTED';

export interface Payment {
  id: string;
  quoteId: string;
  amount: number;
  type: string;
  mode: string;
  status: PaymentStatus;
  reference?: string;
  receivedAt?: string;
  validatedAt?: string;
}

export interface Validation {
  id: string;
  quoteId: string;
  type: string;
  status: ValidationStatus;
  comment?: string;
  validatedBy?: string;
  createdAt: string;
}

// ============================================
// Commission Types
// ============================================

export type CommissionStatus = 'PENDING' | 'PARTIAL' | 'PAID';

export interface Commission {
  id: string;
  commercialId: string;
  commercial?: User;
  quoteId?: string;
  amount: number;
  status: CommissionStatus;
  type: string;
  description?: string;
  paidAmount: number;
  createdAt: string;
  paidAt?: string;
}

// ============================================
// Timeline Types
// ============================================

export type TimelineEntryType =
  | 'CALL'
  | 'EMAIL'
  | 'NOTE'
  | 'APPOINTMENT_SCHEDULED'
  | 'APPOINTMENT_RESCHEDULED'
  | 'APPOINTMENT_COMPLETED'
  | 'APPOINTMENT_CANCELLED'
  | 'QUOTE_CREATED'
  | 'QUOTE_SENT'
  | 'QUOTE_SIGNED'
  | 'STATUS_CHANGE'
  | 'ALERT_CREATED'
  | 'RELANCE'
  | 'DOCUMENT_ADDED'
  | 'REFERRAL';

export interface TimelineEntry {
  id: string;
  prospectId: string;
  userId: string;
  user?: User;
  type: TimelineEntryType;
  content: string;
  metadata?: string;
  createdAt: string;
}

// ============================================
// Alert Types
// ============================================

export type AlertPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type AlertStatusType = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'POSTPONED' | 'ESCALATED';

export interface Alert {
  id: string;
  prospectId?: string;
  prospect?: Prospect;
  assigneeId?: string;
  assignee?: User;
  type: string;
  title: string;
  message?: string;
  priority: AlertPriority;
  status: AlertStatusType;
  dueDate: string;
  metadata?: string;
  createdAt: string;
  completedAt?: string;
}

// ============================================
// Contract Types
// ============================================

export type ContractStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING';

export interface Contract {
  id: string;
  prospectId: string;
  type: string;
  status: ContractStatus;
  startDate: string;
  endDate: string;
  monthlyFee?: number;
  totalAmount?: number;
}

// ============================================
// Sales Phase Types
// ============================================

export type SalesPhaseStatus = 'TO_PROPOSE' | 'QUOTE_SENT' | 'SIGNED' | 'INSTALLED' | 'PAID';

export interface SalesPhase {
  id: string;
  prospectId: string;
  phase: number;
  status: SalesPhaseStatus;
  quoteId?: string;
  plannedDate?: string;
  alertDaysBefore?: number;
  notes?: string;
}

// ============================================
// Zone Types
// ============================================

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface Zone {
  id: string;
  name: string;
  departments: string[];
  postalCodes: string[];
  assignments?: ZoneAssignment[];
}

export interface ZoneAssignment {
  id: string;
  userId: string;
  user?: User;
  zoneId: string;
  zone?: Zone;
  dayOfWeek: DayOfWeek;
}

// ============================================
// API Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// Stats Types
// ============================================

export interface DashboardStats {
  totalProspects: number;
  qualifiedProspects: number;
  appointmentsToday: number;
  quotesInProgress: number;
  signedThisMonth: number;
  caThisMonth: number;
  conversionRate: number;
  pendingAlerts: number;
}
