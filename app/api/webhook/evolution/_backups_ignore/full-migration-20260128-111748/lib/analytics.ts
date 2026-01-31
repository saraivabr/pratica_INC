type AnalyticsEvent = {
  name: string
  category: 'engagement' | 'conversion' | 'error' | 'navigation'
  properties?: Record<string, any>
}

export const trackEvent = async (event: AnalyticsEvent) => {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...event,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      }),
    })
  } catch (error) {
    console.error('Analytics tracking failed:', error)
  }
}

// Helper functions para eventos comuns
export const analytics = {
  // Navegação
  pageView: (page: string) => trackEvent({
    name: 'page_view',
    category: 'navigation',
    properties: { page }
  }),

  // Engajamento
  buttonClick: (buttonName: string, location: string) => trackEvent({
    name: 'button_click',
    category: 'engagement',
    properties: { button: buttonName, location }
  }),

  searchPerformed: (query: string, resultsCount: number) => trackEvent({
    name: 'search_performed',
    category: 'engagement',
    properties: { query, results: resultsCount }
  }),

  // Conversão
  propertyViewed: (propertyId: number, propertyName: string) => trackEvent({
    name: 'property_viewed',
    category: 'conversion',
    properties: { property_id: propertyId, property_name: propertyName }
  }),

  simulationCalculated: (type: string, value: number) => trackEvent({
    name: 'simulation_calculated',
    category: 'conversion',
    properties: { simulation_type: type, value }
  }),

  leadGenerated: (source: string) => trackEvent({
    name: 'lead_generated',
    category: 'conversion',
    properties: { source }
  }),

  // Comparação de propriedades
  propertyAddedToComparison: (propertyId: number) => trackEvent({
    name: 'property_added_to_comparison',
    category: 'engagement',
    properties: { property_id: propertyId }
  }),

  comparisonViewed: (propertyCount: number) => trackEvent({
    name: 'comparison_viewed',
    category: 'engagement',
    properties: { property_count: propertyCount }
  }),

  // Erros
  error: (errorMessage: string, errorContext?: string) => trackEvent({
    name: 'error_occurred',
    category: 'error',
    properties: { message: errorMessage, context: errorContext }
  }),
}
