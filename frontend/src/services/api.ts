import type { ApiResponse } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('sgs_token', token);
    } else {
      localStorage.removeItem('sgs_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('sgs_token');
    }
    return this.token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${API_BASE}${path}`, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          url.searchParams.set(key, value);
        }
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401) {
      this.setToken(null);
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Request failed: ${response.status}`);
    }

    return data;
  }

  // Auth
  login(email: string, password: string) {
    return this.request<{ token: string; user: import('../types').User }>('POST', '/auth/login', { email, password });
  }

  getProfile() {
    return this.request<{ user: import('../types').User }>('GET', '/auth/profile');
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.request('POST', '/auth/change-password', { currentPassword, newPassword });
  }

  // Users
  getUsers(params?: Record<string, string>) {
    return this.request<{ users: import('../types').User[] }>('GET', '/auth/users', undefined, params);
  }

  createUser(data: Partial<import('../types').User> & { password: string }) {
    return this.request<{ user: import('../types').User }>('POST', '/auth/register', data);
  }

  updateUser(id: string, data: Partial<import('../types').User>) {
    return this.request<{ user: import('../types').User }>('PUT', `/auth/users/${id}`, data);
  }

  deleteUser(id: string) {
    return this.request('DELETE', `/auth/users/${id}`);
  }

  // Prospects
  getProspects(params?: Record<string, string>) {
    return this.request<import('../types').Prospect[]>('GET', '/prospects', undefined, params);
  }

  getProspect(id: string) {
    return this.request<import('../types').Prospect>('GET', `/prospects/${id}`);
  }

  createProspect(data: Partial<import('../types').Prospect>) {
    return this.request<import('../types').Prospect>('POST', '/prospects', data);
  }

  updateProspect(id: string, data: Partial<import('../types').Prospect>) {
    return this.request<import('../types').Prospect>('PUT', `/prospects/${id}`, data);
  }

  qualifyProspect(id: string, answers: Array<{ questionId: string; answer: string }>) {
    return this.request('POST', `/prospects/${id}/qualify`, { answers });
  }

  addTimelineEntry(id: string, data: { type: string; content: string }) {
    return this.request('POST', `/prospects/${id}/timeline`, data);
  }

  getTimeline(id: string) {
    return this.request<import('../types').TimelineEntry[]>('GET', `/prospects/${id}/timeline`);
  }

  setReferral(id: string, referredById: string) {
    return this.request('POST', `/prospects/${id}/referral`, { referredById });
  }

  // Appointments
  getAppointments(params?: Record<string, string>) {
    return this.request<import('../types').Appointment[]>('GET', '/appointments', undefined, params);
  }

  createAppointment(data: Partial<import('../types').Appointment>) {
    return this.request<import('../types').Appointment>('POST', '/appointments', data);
  }

  updateAppointment(id: string, data: Partial<import('../types').Appointment>) {
    return this.request<import('../types').Appointment>('PUT', `/appointments/${id}`, data);
  }

  getCalendar(commercialId: string, weekStart: string) {
    return this.request('GET', `/appointments/calendar/${commercialId}`, undefined, { weekStart });
  }

  getZones(params?: Record<string, string>) {
    return this.request<import('../types').Zone[]>('GET', '/appointments/zones', undefined, params);
  }

  // Products
  getProducts(params?: Record<string, string>) {
    return this.request<import('../types').Product[]>('GET', '/products', undefined, params);
  }

  createProduct(data: Partial<import('../types').Product>) {
    return this.request<import('../types').Product>('POST', '/products', data);
  }

  updateProduct(id: string, data: Partial<import('../types').Product>) {
    return this.request<import('../types').Product>('PUT', `/products/${id}`, data);
  }

  getKits() {
    return this.request<import('../types').Kit[]>('GET', '/products/kits');
  }

  createKit(data: { name: string; description?: string; items: Array<{ productId: string; quantity: number }> }) {
    return this.request<import('../types').Kit>('POST', '/products/kits', data);
  }

  // Quotes
  getQuotes(params?: Record<string, string>) {
    return this.request<import('../types').Quote[]>('GET', '/quotes', undefined, params);
  }

  getQuote(id: string) {
    return this.request<import('../types').Quote>('GET', `/quotes/${id}`);
  }

  createQuote(data: { prospectId: string; lines?: Array<{ productId: string; quantity: number }>; upsells?: Array<{ name: string; priceHT: number; isMonthly: boolean }> }) {
    return this.request<import('../types').Quote>('POST', '/quotes', data);
  }

  updateQuote(id: string, data: Partial<import('../types').Quote>) {
    return this.request<import('../types').Quote>('PUT', `/quotes/${id}`, data);
  }

  updateQuoteLines(id: string, lines: Array<{ productId: string; quantity: number; unitPriceHT?: number }>) {
    return this.request<import('../types').Quote>('PUT', `/quotes/${id}/lines`, { lines });
  }

  signQuote(id: string, data: { paymentMode: string; clientSignatureUrl?: string; commercialSignatureUrl?: string; checkNumber?: string; leasingOrganism?: string; leasingDuration?: number }) {
    return this.request<import('../types').Quote>('POST', `/quotes/${id}/sign`, data);
  }

  applyKit(quoteId: string, kitId: string) {
    return this.request<import('../types').Quote>('POST', `/quotes/${quoteId}/apply-kit`, { kitId });
  }

  validateQuote(id: string, data: { status: 'APPROVED' | 'REFUSED'; comment?: string }) {
    return this.request('POST', `/quotes/${id}/validate`, data);
  }

  // Alerts
  getAlerts(params?: Record<string, string>) {
    return this.request<import('../types').Alert[]>('GET', '/alerts', undefined, params);
  }

  createAlert(data: Partial<import('../types').Alert>) {
    return this.request<import('../types').Alert>('POST', '/alerts', data);
  }

  updateAlert(id: string, data: Partial<import('../types').Alert>) {
    return this.request<import('../types').Alert>('PUT', `/alerts/${id}`, data);
  }

  getAlertDashboard() {
    return this.request('GET', '/alerts/dashboard');
  }

  // Commissions
  getCommissions(params?: Record<string, string>) {
    return this.request<import('../types').Commission[]>('GET', '/commissions', undefined, params);
  }

  getCommissionDashboard(params?: Record<string, string>) {
    return this.request('GET', '/commissions/dashboard', undefined, params);
  }

  generateCommission(quoteId: string) {
    return this.request('POST', '/commissions/generate', { quoteId });
  }

  updateCommission(id: string, data: Partial<import('../types').Commission>) {
    return this.request<import('../types').Commission>('PUT', `/commissions/${id}`, data);
  }

  // Stats
  getStatsTeleprospection(params?: Record<string, string>) {
    return this.request('GET', '/stats/teleprospection', undefined, params);
  }

  getStatsCommercial(params?: Record<string, string>) {
    return this.request('GET', '/stats/commercial', undefined, params);
  }

  getStatsPipeline() {
    return this.request('GET', '/stats/pipeline');
  }

  getStatsReferrals() {
    return this.request('GET', '/stats/referrals');
  }

  getStatsGlobal() {
    return this.request('GET', '/stats/global');
  }

  getStatsGamification(params?: Record<string, string>) {
    return this.request('GET', '/stats/gamification', undefined, params);
  }

  // Admin
  getQuestions(params?: Record<string, string>) {
    return this.request<import('../types').QualificationQuestion[]>('GET', '/admin/questions', undefined, params);
  }

  createQuestion(data: Partial<import('../types').QualificationQuestion>) {
    return this.request<import('../types').QualificationQuestion>('POST', '/admin/questions', data);
  }

  updateQuestion(id: string, data: Partial<import('../types').QualificationQuestion>) {
    return this.request<import('../types').QualificationQuestion>('PUT', `/admin/questions/${id}`, data);
  }

  getAdminZones() {
    return this.request('GET', '/admin/zones');
  }

  createZone(data: { name: string; departments: string[]; postalCodes?: string[] }) {
    return this.request('POST', '/admin/zones', data);
  }

  updateZone(id: string, data: Partial<import('../types').Zone>) {
    return this.request('PUT', `/admin/zones/${id}`, data);
  }

  createZoneAssignment(data: { userId: string; zoneId: string; dayOfWeek: string }) {
    return this.request('POST', '/admin/zones/assignments', data);
  }

  getCommissionRules() {
    return this.request('GET', '/admin/commission-rules');
  }

  createCommissionRule(data: Record<string, unknown>) {
    return this.request('POST', '/admin/commission-rules', data);
  }

  updateCommissionRule(id: string, data: Record<string, unknown>) {
    return this.request('PUT', `/admin/commission-rules/${id}`, data);
  }

  getReferralConfig() {
    return this.request('GET', '/admin/referral-config');
  }

  updateReferralConfig(data: Record<string, unknown>) {
    return this.request('PUT', '/admin/referral-config', data);
  }

  // Password reset
  forgotPassword(email: string) {
    return this.request('POST', '/auth/forgot-password', { email });
  }

  resetPassword(token: string, password: string) {
    return this.request('POST', '/auth/reset-password', { token, password });
  }

  updateProfile(data: { firstName?: string; lastName?: string; phone?: string }) {
    return this.request('PUT', '/auth/profile', data);
  }

  // Payments
  getPayments(params?: Record<string, string>) {
    return this.request('GET', '/payments', undefined, params);
  }

  getPendingPayments() {
    return this.request('GET', '/payments/pending');
  }

  getPaymentStats() {
    return this.request('GET', '/payments/stats');
  }

  createPayment(data: { quoteId: string; amount: number; type: string; mode: string; reference?: string }) {
    return this.request('POST', '/payments', data);
  }

  updatePayment(id: string, data: { status?: string; reference?: string; receivedAt?: string }) {
    return this.request('PUT', `/payments/${id}`, data);
  }

  validatePayment(id: string, data: { approved: boolean; comment?: string }) {
    return this.request('POST', `/payments/${id}/validate`, data);
  }

  // Contracts
  getContracts(params?: Record<string, string>) {
    return this.request('GET', '/contracts', undefined, params);
  }

  getExpiringContracts(days?: number) {
    return this.request('GET', '/contracts/expiring', undefined, days ? { days: days.toString() } : undefined);
  }

  getContractStats() {
    return this.request('GET', '/contracts/stats');
  }

  getContract(id: string) {
    return this.request('GET', `/contracts/${id}`);
  }

  createContract(data: { prospectId: string; type: string; startDate: string; endDate: string; monthlyFee?: number; totalAmount?: number }) {
    return this.request('POST', '/contracts', data);
  }

  updateContract(id: string, data: { status?: string; startDate?: string; endDate?: string; monthlyFee?: number }) {
    return this.request('PUT', `/contracts/${id}`, data);
  }

  renewContract(id: string, data: { newEndDate: string; newMonthlyFee?: number }) {
    return this.request('POST', `/contracts/${id}/renew`, data);
  }

  // Uploads
  async uploadFile(file: File, options?: { prospectId?: string; type?: string; category?: string }) {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.prospectId) formData.append('prospectId', options.prospectId);
    if (options?.type) formData.append('type', options.type);

    const token = this.getToken();
    const url = new URL(`${API_BASE}/uploads`, window.location.origin);
    if (options?.category) url.searchParams.set('category', options.category);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    return response.json();
  }

  async uploadSignature(signature: string, prospectId?: string, type?: string) {
    return this.request('POST', '/uploads/signature', { signature, prospectId, type });
  }

  async uploadAuditPhoto(file: File, prospectId: string, category: string, lat?: number, lng?: number) {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('prospectId', prospectId);
    formData.append('category', category);
    if (lat) formData.append('lat', lat.toString());
    if (lng) formData.append('lng', lng.toString());

    const token = this.getToken();
    const response = await fetch(`${API_BASE}/uploads/audit-photo`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    return response.json();
  }

  getProspectDocuments(prospectId: string) {
    return this.request('GET', `/uploads/prospect/${prospectId}`);
  }

  deleteDocument(id: string) {
    return this.request('DELETE', `/uploads/${id}`);
  }

  // Exports
  exportProspects(params?: Record<string, string>) {
    const token = this.getToken();
    const url = new URL(`${API_BASE}/exports/prospects`, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
      });
    }
    window.open(url.toString() + (token ? `&token=${token}` : ''), '_blank');
  }

  exportQuotes(params?: Record<string, string>) {
    const token = this.getToken();
    const url = new URL(`${API_BASE}/exports/quotes`, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
      });
    }
    window.open(url.toString() + (token ? `&token=${token}` : ''), '_blank');
  }

  exportCommissions(params?: Record<string, string>) {
    const token = this.getToken();
    const url = new URL(`${API_BASE}/exports/commissions`, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
      });
    }
    window.open(url.toString() + (token ? `&token=${token}` : ''), '_blank');
  }

  async downloadQuotePdf(quoteId: string) {
    const token = this.getToken();
    const response = await fetch(`${API_BASE}/exports/quote/${quoteId}/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devis_${quoteId}.pdf`;
    a.click();
  }

  async downloadStatsReport(period: 'week' | 'month' | 'quarter' | 'year' = 'month') {
    const token = this.getToken();
    const response = await fetch(`${API_BASE}/exports/stats/report?period=${period}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_${period}_${new Date().toISOString().split('T')[0]}.pdf`;
    a.click();
  }

  // Notifications
  getNotifications(params?: { unreadOnly?: boolean; limit?: number }) {
    return this.request('GET', '/notifications', undefined, params as Record<string, string>);
  }

  getUnreadCount() {
    return this.request<{ count: number }>('GET', '/notifications/unread-count');
  }

  markNotificationAsRead(id: string) {
    return this.request('PUT', `/notifications/${id}/read`);
  }

  markAllNotificationsAsRead() {
    return this.request('PUT', '/notifications/read-all');
  }

  deleteNotification(id: string) {
    return this.request('DELETE', `/notifications/${id}`);
  }

  // Validations
  getValidations(params?: Record<string, string>) {
    return this.request('GET', '/validations', undefined, params);
  }

  getPendingValidations() {
    return this.request('GET', '/validations/pending');
  }

  processValidation(id: string, data: { status: 'APPROVED' | 'REFUSED' | 'INFO_REQUESTED'; comment?: string }) {
    return this.request('PUT', `/validations/${id}`, data);
  }

  // Comments
  getComments(prospectId: string) {
    return this.request('GET', `/comments/prospect/${prospectId}`);
  }

  getRecentComments(limit?: number) {
    return this.request('GET', '/comments/recent', undefined, limit ? { limit: limit.toString() } : undefined);
  }

  createComment(prospectId: string, content: string, mentions?: string[]) {
    return this.request<any>('POST', '/comments', { prospectId, content, mentions });
  }

  updateComment(id: string, content: string) {
    return this.request<any>('PUT', `/comments/${id}`, { content });
  }

  deleteComment(id: string) {
    return this.request('DELETE', `/comments/${id}`);
  }

  // Google Calendar Integration
  getGoogleCalendarStatus() {
    return this.request<{
      connected: boolean;
      email?: string;
      syncEnabled?: boolean;
      lastSyncAt?: string;
    }>('GET', '/calendar/google/status');
  }

  getGoogleConnectUrl() {
    return this.request<{ url: string }>('GET', '/calendar/google/connect');
  }

  disconnectGoogleCalendar() {
    return this.request('POST', '/calendar/google/disconnect');
  }

  syncGoogleCalendar() {
    return this.request<{ success: boolean; syncedEvents?: number }>('POST', '/calendar/google/sync');
  }

  toggleGoogleSync(enabled: boolean) {
    return this.request('PUT', '/calendar/google/settings', { syncEnabled: enabled });
  }
}

export const api = new ApiService();
export default api;
