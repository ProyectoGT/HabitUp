import { supabase } from './supabase';
import { quotesService } from './quotes.service';
import type { Project, ProjectStatus, ProjectWithDetails } from '@/types/models';
import { PROJECT_STATUS } from '@/utils/constants';

export const projectsService = {
  /**
   * Obtiene un proyecto por su ID, con datos del cliente, profesional y categoría.
   * Accesible para el cliente y el profesional participantes (RLS).
   */
  async getById(id: string): Promise<ProjectWithDetails | null> {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        categories(name),
        client:users!client_id(id, full_name, avatar_url),
        professional:professional_profiles!professional_id(
          id, company_name, user_id,
          users(full_name, avatar_url)
        )
      `)
      .eq('id', id)
      .single();
    if (error?.code === 'PGRST116') return null;
    if (error) throw error;
    return data as unknown as ProjectWithDetails;
  },

  /**
   * Lista los proyectos del usuario autenticado (como cliente o profesional).
   * professional_id en projects referencia professional_profiles.id,
   * no users.id — por eso primero resuelve los IDs de perfil.
   */
  async getMyProjects(): Promise<ProjectWithDetails[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profiles } = await supabase
      .from('professional_profiles')
      .select('id')
      .eq('user_id', user.id);

    const professionalIds = (profiles ?? []).map((p: { id: string }) => p.id);

    const clientFilter = `client_id.eq.${user.id}`;
    const proFilter = professionalIds.length > 0
      ? `professional_id.in.(${professionalIds.join(',')})`
      : null;

    const filter = proFilter ? `${clientFilter},${proFilter}` : clientFilter;

    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        categories(name),
        client:users!client_id(id, full_name, avatar_url),
        professional:professional_profiles!professional_id(
          id, company_name, user_id,
          users(full_name, avatar_url)
        )
      `)
      .or(filter)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as ProjectWithDetails[];
  },

  /**
   * Actualiza solo el estado del proyecto.
   * El trigger `enforce_project_status_transition` en la DB valida
   * que la transición sea válida y que el usuario tenga permisos.
   *
   * Jamás modifica importes, participantes ni otros campos protegidos.
   */
  async updateStatus(id: string, status: ProjectStatus): Promise<void> {
    const updates: Record<string, string> = { status };
    if (status === PROJECT_STATUS.COMPLETED) {
      updates.actual_end_date = new Date().toISOString().slice(0, 10);
    }

    const { error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * Cliente confirma finalización del proyecto vía RPC atómico.
   * Valida: proyecto en pendiente_finalizacion, cliente es dueño.
   * Actualiza projects.status → 'completado' y actual_end_date.
   * NO depende del payment_status (pago y obra van separados).
   */
  async completeProject(id: string): Promise<Project> {
    const { data, error } = await supabase
      .rpc('complete_project', { p_project_id: id });
    if (error) throw error;
    return (data as unknown as Project[])[0];
  },

  /**
   * Profesional solicita finalización vía RPC.
   * Marca projects.status → 'pendiente_finalizacion' y notifica al cliente.
   */
  async requestCompletion(id: string): Promise<Project> {
    const { data, error } = await supabase
      .rpc('request_project_completion', { p_project_id: id });
    if (error) throw error;
    return (data as unknown as Project[])[0];
  },

  /**
   * Acepta un presupuesto y crea el proyecto de forma atómica.
   * Delega en el RPC `accept_quote` que valida:
   *   - El usuario autenticado es el cliente propietario del lead
   *   - El quote pertenece al lead y está en estado aceptable
   *   - El lead está activo
   *   - Calcula comisión y crea el proyecto + notificación
   *
   * Es la ÚNICA forma de crear proyectos en producción.
   */
  async acceptQuote(quoteId: string): Promise<Project> {
    return quotesService.accept(quoteId);
  },
};
