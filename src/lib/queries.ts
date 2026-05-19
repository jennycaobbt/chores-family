import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Chore, Completion, Location, Person, Trade } from './database.types'

const KEY = {
  people: ['people'] as const,
  locations: ['locations'] as const,
  chores: ['chores'] as const,
  completions: ['completions'] as const,
  trades: ['trades'] as const,
}

export function usePeople() {
  return useQuery({
    queryKey: KEY.people,
    queryFn: async (): Promise<Person[]> => {
      const { data, error } = await supabase
        .from('people')
        .select('*')
        .order('sort_order')
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useLocations() {
  return useQuery({
    queryKey: KEY.locations,
    queryFn: async (): Promise<Location[]> => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('sort_order')
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useChores() {
  return useQuery({
    queryKey: KEY.chores,
    queryFn: async (): Promise<Chore[]> => {
      const { data, error } = await supabase
        .from('chores')
        .select('*')
        .eq('archived', false)
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useCompletions() {
  return useQuery({
    queryKey: KEY.completions,
    queryFn: async (): Promise<Completion[]> => {
      const { data, error } = await supabase
        .from('completions')
        .select('*')
        .order('completed_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useCompletionHistory() {
  return useQuery({
    queryKey: [...KEY.completions, 'history'] as const,
    queryFn: async (): Promise<Completion[]> => {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 90)
      const { data, error } = await supabase
        .from('completions')
        .select('*')
        .gte('completed_at', cutoff.toISOString())
        .order('completed_at', { ascending: false })
      if (error) throw error
      return data
    },
    staleTime: 30_000,
  })
}

// ---------- Mutations ----------

export function useCompleteChore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      choreId: string
      personId: string | null
      points: number
    }): Promise<Completion> => {
      const { data, error } = await supabase
        .from('completions')
        .insert({
          chore_id: input.choreId,
          person_id: input.personId,
          points_awarded: input.personId === null ? 0 : input.points,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY.completions }),
  })
}

export function useUndoCompletion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (completionId: string) => {
      const { error } = await supabase.from('completions').delete().eq('id', completionId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY.completions }),
  })
}

// People CRUD
export function useUpsertPerson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      person: Partial<Person> & { name: string; id?: string },
    ): Promise<Person> => {
      if (person.id) {
        const { data, error } = await supabase
          .from('people')
          .update({
            name: person.name,
            photo_url: person.photo_url ?? null,
            sort_order: person.sort_order ?? 0,
          })
          .eq('id', person.id)
          .select()
          .single()
        if (error) throw error
        return data
      }
      const { data, error } = await supabase
        .from('people')
        .insert({
          name: person.name,
          photo_url: person.photo_url ?? null,
          sort_order: person.sort_order ?? 0,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY.people }),
  })
}

export function useDeletePerson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('people').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY.people })
      qc.invalidateQueries({ queryKey: KEY.chores })
    },
  })
}

// Locations CRUD
export function useUpsertLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      loc: Partial<Location> & { name: string; id?: string },
    ): Promise<Location> => {
      if (loc.id) {
        const { data, error } = await supabase
          .from('locations')
          .update({ name: loc.name, sort_order: loc.sort_order ?? 0, icon: loc.icon ?? null })
          .eq('id', loc.id)
          .select()
          .single()
        if (error) throw error
        return data
      }
      const { data, error } = await supabase
        .from('locations')
        .insert({ name: loc.name, sort_order: loc.sort_order ?? 0, icon: loc.icon ?? null })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY.locations }),
  })
}

export function useDeleteLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('locations').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY.locations })
      qc.invalidateQueries({ queryKey: KEY.chores })
    },
  })
}

// Chores CRUD
export function useUpsertChore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      chore: Partial<Chore> & {
        name: string
        frequency_type: Chore['frequency_type']
        id?: string
      },
    ): Promise<Chore> => {
      const payload = {
        name: chore.name,
        frequency_type: chore.frequency_type,
        frequency_n: chore.frequency_n ?? null,
        location_id: chore.location_id ?? null,
        default_person_id: chore.default_person_id ?? null,
        points: chore.points ?? 1,
        icon: chore.icon ?? null,
      }
      if (chore.id) {
        const { data, error } = await supabase
          .from('chores')
          .update(payload)
          .eq('id', chore.id)
          .select()
          .single()
        if (error) throw error
        return data
      }
      const { data, error } = await supabase
        .from('chores')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY.chores }),
  })
}

export function useDeleteChore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('chores').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY.chores })
      qc.invalidateQueries({ queryKey: KEY.completions })
    },
  })
}

export function useDeleteAllCompletions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('completions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY.completions }),
  })
}

// Trades
export function useTrades() {
  return useQuery({
    queryKey: KEY.trades,
    queryFn: async (): Promise<Trade[]> => {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    staleTime: 15_000,
  })
}

export function useCreateTrade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      proposer_id: string
      proposer_chore_id: string
      target_id: string
      target_chore_id: string
    }): Promise<Trade> => {
      const { data, error } = await supabase
        .from('trades')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY.trades }),
  })
}

export function useAcceptTrade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (trade: Trade) => {
      const now = new Date().toISOString()
      // Swap the default_person_id on both chores
      const [r1, r2] = await Promise.all([
        supabase
          .from('chores')
          .update({ default_person_id: trade.target_id })
          .eq('id', trade.proposer_chore_id),
        supabase
          .from('chores')
          .update({ default_person_id: trade.proposer_id })
          .eq('id', trade.target_chore_id),
      ])
      if (r1.error) throw r1.error
      if (r2.error) throw r2.error

      // Mark this trade accepted
      const { error: e3 } = await supabase
        .from('trades')
        .update({ status: 'accepted', resolved_at: now })
        .eq('id', trade.id)
      if (e3) throw e3

      // Auto-cancel other pending trades involving either chore
      const { error: e4 } = await supabase
        .from('trades')
        .update({ status: 'cancelled', resolved_at: now })
        .eq('status', 'pending')
        .neq('id', trade.id)
        .or(
          `proposer_chore_id.eq.${trade.proposer_chore_id},` +
          `proposer_chore_id.eq.${trade.target_chore_id},` +
          `target_chore_id.eq.${trade.proposer_chore_id},` +
          `target_chore_id.eq.${trade.target_chore_id}`,
        )
      if (e4) throw e4
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY.trades })
      qc.invalidateQueries({ queryKey: KEY.chores })
    },
  })
}

export function useDeclineTrade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (tradeId: string) => {
      const { error } = await supabase
        .from('trades')
        .update({ status: 'declined', resolved_at: new Date().toISOString() })
        .eq('id', tradeId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY.trades }),
  })
}

export function useCancelTrade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (tradeId: string) => {
      const { error } = await supabase
        .from('trades')
        .update({ status: 'cancelled', resolved_at: new Date().toISOString() })
        .eq('id', tradeId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY.trades }),
  })
}

// Photo upload
export async function uploadPersonPhoto(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('person-photos').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })
  if (error) throw error
  const { data } = supabase.storage.from('person-photos').getPublicUrl(path)
  return data.publicUrl
}

// Icon upload (chores / locations)
export async function uploadIcon(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'png'
  const path = `icons/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('person-photos').upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type,
  })
  if (error) throw error
  const { data } = supabase.storage.from('person-photos').getPublicUrl(path)
  return data.publicUrl
}
