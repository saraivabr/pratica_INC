/**
 * Utility functions for exporting data
 */

interface Lead {
  id?: number | string
  nome?: string
  email?: string
  telefone?: string
  celular?: string
  origem?: string
  midia?: string
  corretor?: { id?: number; nome?: string } | string
  empreendimento?: { id?: number; nome?: string } | string
  data_cadastro?: string
  situacao?: string
  [key: string]: any
}

/**
 * Export leads to CSV and download
 */
export function exportLeadsToCSV(leads: Lead[], filename = 'leads') {
  // Define columns
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'nome', label: 'Nome' },
    { key: 'email', label: 'Email' },
    { key: 'telefone', label: 'Telefone' },
    { key: 'origem', label: 'Origem' },
    { key: 'corretor', label: 'Corretor' },
    { key: 'empreendimento', label: 'Empreendimento' },
    { key: 'data_cadastro', label: 'Data Cadastro' },
    { key: 'situacao', label: 'Situação' },
  ]

  // Create header row
  const header = columns.map(col => col.label).join(';')

  // Create data rows
  const rows = leads.map(lead => {
    return columns.map(col => {
      let value = lead[col.key]

      // Handle nested objects
      if (col.key === 'corretor') {
        value = typeof lead.corretor === 'object' ? lead.corretor?.nome : lead.corretor
      }
      if (col.key === 'empreendimento') {
        value = typeof lead.empreendimento === 'object' ? lead.empreendimento?.nome : lead.empreendimento
      }
      if (col.key === 'telefone') {
        value = lead.celular || lead.telefone
      }
      if (col.key === 'origem') {
        value = (lead.origem || lead.midia || '')
          .replace('Origem: ', '')
          .replace('Origem:', '')
      }

      // Escape and format value
      if (value === null || value === undefined) {
        return ''
      }

      // Convert to string and escape quotes
      const strValue = String(value).replace(/"/g, '""')

      // Wrap in quotes if contains delimiter, newline, or quotes
      if (strValue.includes(';') || strValue.includes('\n') || strValue.includes('"')) {
        return `"${strValue}"`
      }

      return strValue
    }).join(';')
  })

  // Combine header and rows
  const csv = [header, ...rows].join('\n')

  // Add BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' })

  // Create download link
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`

  // Trigger download
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Cleanup
  URL.revokeObjectURL(url)
}
