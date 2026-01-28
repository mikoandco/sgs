import type { ApiResponse } from '../types';

const API_BASE = '/api/v1';

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
    return this.request<import('../types').User>('GET', '/auth/me');
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.request('POST', '/auth/change-password', { currentPassword, newPassword });
  }

  // Users
  getUsers(params?: Record<string, string>) {
    return this.request<import('../types').User[]>('GET', '/users', undefined, params);
  }

  createUser(data: Partial<import('../types').User> & { password: string }) {
    return this.request<import('../types').User>('POST', '/users', data);
  }

  updateUser(id: string, data: Partial<import('../types').User>) {
    return this.request<import('../types').User>('PUT', `/users/${id}`, data);
  }

  deleteUser(id: string) {
    return this.request('DELETE', `/users/${id}`);
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
}

export const api = new ApiService();
export default api;
