"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";

// Types
export interface UserFeature {
  feature_slug: string;
  feature_nome: string;
  feature_icone?: string;
  rota_base?: string;
  enabled: boolean;
  is_override: boolean;
}

export interface UserHierarquia {
  id: number;
  slug: string;
  nome: string;
  nivel: number;
}

export interface FeaturesContextType {
  features: UserFeature[];
  hierarquia: UserHierarquia | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  canAccess: (featureSlug: string) => boolean;
  getFeature: (featureSlug: string) => UserFeature | undefined;
}

// Context para compartilhar features entre componentes
const FeaturesContext = createContext<FeaturesContextType | null>(null);

// Provider component
export function FeaturesProvider({ children }: { children: React.ReactNode }) {
  const [features, setFeatures] = useState<UserFeature[]>([]);
  const [hierarquia, setHierarquia] = useState<UserHierarquia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeatures = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/auth/features");

      if (!response.ok) {
        if (response.status === 401) {
          // Usuário não autenticado - não é erro
          setFeatures([]);
          setHierarquia(null);
          return;
        }
        throw new Error("Erro ao carregar permissões");
      }

      const data = await response.json();
      setFeatures(data.features || []);
      setHierarquia(data.hierarquia || null);
    } catch (err) {
      console.error("Error fetching features:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  const canAccess = useCallback(
    (featureSlug: string): boolean => {
      const feature = features.find((f) => f.feature_slug === featureSlug);
      return feature?.enabled ?? false;
    },
    [features]
  );

  const getFeature = useCallback(
    (featureSlug: string): UserFeature | undefined => {
      return features.find((f) => f.feature_slug === featureSlug);
    },
    [features]
  );

  return (
    <FeaturesContext.Provider
      value={{
        features,
        hierarquia,
        loading,
        error,
        refetch: fetchFeatures,
        canAccess,
        getFeature,
      }}
    >
      {children}
    </FeaturesContext.Provider>
  );
}

// Hook para usar o contexto
export function useFeatures(): FeaturesContextType {
  const context = useContext(FeaturesContext);
  if (!context) {
    throw new Error("useFeatures must be used within a FeaturesProvider");
  }
  return context;
}

// Hook simplificado para verificar acesso a uma feature específica
export function useFeatureAccess(featureSlug: string): {
  allowed: boolean;
  blocked: boolean;
  loading: boolean;
  message: string;
  feature: UserFeature | undefined;
} {
  const { canAccess, getFeature, loading } = useFeatures();

  const feature = getFeature(featureSlug);
  const allowed = canAccess(featureSlug);

  return {
    allowed,
    blocked: !allowed && !loading,
    loading,
    message: allowed ? "" : "Fale com o administrador para liberar este recurso",
    feature,
  };
}

// Hook para verificar nível hierárquico
export function useHierarchyLevel(): {
  hierarquia: UserHierarquia | null;
  loading: boolean;
  isMaster: boolean;
  isDiretorOrAbove: boolean;
  isGerenteOrAbove: boolean;
  nivel: number;
} {
  const { hierarquia, loading } = useFeatures();

  const nivel = hierarquia?.nivel ?? 999;

  return {
    hierarquia,
    loading,
    isMaster: nivel === 1,
    isDiretorOrAbove: nivel <= 2,
    isGerenteOrAbove: nivel <= 3,
    nivel,
  };
}
