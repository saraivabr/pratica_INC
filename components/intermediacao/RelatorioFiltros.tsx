'use client';

import * as React from 'react';
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Search, X, Filter, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FiltrosRelatorio, PresetPeriodo, OpcoesFiltro } from './types';

// Presets de periodo
const PRESETS_PERIODO: PresetPeriodo[] = [
  {
    label: 'Hoje',
    value: 'hoje',
    getRange: () => ({
      inicio: startOfDay(new Date()),
      fim: endOfDay(new Date()),
    }),
  },
  {
    label: 'Ontem',
    value: 'ontem',
    getRange: () => ({
      inicio: startOfDay(subDays(new Date(), 1)),
      fim: endOfDay(subDays(new Date(), 1)),
    }),
  },
  {
    label: 'Ultimos 7 dias',
    value: '7dias',
    getRange: () => ({
      inicio: startOfDay(subDays(new Date(), 7)),
      fim: endOfDay(new Date()),
    }),
  },
  {
    label: 'Esta semana',
    value: 'semana',
    getRange: () => ({
      inicio: startOfWeek(new Date(), { locale: ptBR }),
      fim: endOfWeek(new Date(), { locale: ptBR }),
    }),
  },
  {
    label: 'Este mes',
    value: 'mes',
    getRange: () => ({
      inicio: startOfMonth(new Date()),
      fim: endOfMonth(new Date()),
    }),
  },
  {
    label: 'Ultimos 30 dias',
    value: '30dias',
    getRange: () => ({
      inicio: startOfDay(subDays(new Date(), 30)),
      fim: endOfDay(new Date()),
    }),
  },
  {
    label: 'Este trimestre',
    value: 'trimestre',
    getRange: () => ({
      inicio: startOfQuarter(new Date()),
      fim: endOfQuarter(new Date()),
    }),
  },
  {
    label: 'Este ano',
    value: 'ano',
    getRange: () => ({
      inicio: startOfYear(new Date()),
      fim: endOfYear(new Date()),
    }),
  },
  {
    label: 'Personalizado',
    value: 'custom',
    getRange: () => ({
      inicio: startOfMonth(new Date()),
      fim: endOfDay(new Date()),
    }),
  },
];

// Status options padrao
const STATUS_OPTIONS = [
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluida', label: 'Concluida' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'distratada', label: 'Distratada' },
];

interface RelatorioFiltrosProps {
  filtros: FiltrosRelatorio;
  onChange: (filtros: FiltrosRelatorio) => void;
  opcoes?: {
    mostrarPeriodo?: boolean;
    mostrarBeneficiario?: boolean;
    mostrarEmpreendimento?: boolean;
    mostrarStatus?: boolean;
  };
  dadosOpcoes?: Partial<OpcoesFiltro>;
  className?: string;
  onLimpar?: () => void;
  compacto?: boolean;
}

export function RelatorioFiltros({
  filtros,
  onChange,
  opcoes = {
    mostrarPeriodo: true,
    mostrarBeneficiario: true,
    mostrarEmpreendimento: true,
    mostrarStatus: true,
  },
  dadosOpcoes,
  className,
  onLimpar,
  compacto = false,
}: RelatorioFiltrosProps) {
  const [presetSelecionado, setPresetSelecionado] = React.useState<string>('mes');
  const [buscaBeneficiario, setBuscaBeneficiario] = React.useState('');
  const [buscaEmpreendimento, setBuscaEmpreendimento] = React.useState('');
  const [statusSelecionados, setStatusSelecionados] = React.useState<string[]>(
    filtros.status || []
  );

  // Atualizar periodo baseado no preset
  const handlePresetChange = (preset: string) => {
    setPresetSelecionado(preset);
    const presetConfig = PRESETS_PERIODO.find(p => p.value === preset);
    if (presetConfig && preset !== 'custom') {
      const range = presetConfig.getRange();
      onChange({
        ...filtros,
        periodoInicio: range.inicio,
        periodoFim: range.fim,
      });
    }
  };

  // Handler para mudanca de data personalizada
  const handleDateChange = (field: 'periodoInicio' | 'periodoFim', value: string) => {
    if (!value) return;
    const date = new Date(value);
    if (isNaN(date.getTime())) return;

    onChange({
      ...filtros,
      [field]: field === 'periodoInicio' ? startOfDay(date) : endOfDay(date),
    });
    setPresetSelecionado('custom');
  };

  // Handler para status multi-select
  const handleStatusToggle = (status: string) => {
    const newStatus = statusSelecionados.includes(status)
      ? statusSelecionados.filter(s => s !== status)
      : [...statusSelecionados, status];

    setStatusSelecionados(newStatus);
    onChange({
      ...filtros,
      status: newStatus.length > 0 ? newStatus : undefined,
    });
  };

  // Filtrar beneficiarios pela busca
  const beneficiariosFiltrados = React.useMemo(() => {
    if (!dadosOpcoes?.beneficiarios) return [];
    if (!buscaBeneficiario) return dadosOpcoes.beneficiarios;
    return dadosOpcoes.beneficiarios.filter(b =>
      b.nome.toLowerCase().includes(buscaBeneficiario.toLowerCase())
    );
  }, [dadosOpcoes?.beneficiarios, buscaBeneficiario]);

  // Filtrar empreendimentos pela busca
  const empreendimentosFiltrados = React.useMemo(() => {
    if (!dadosOpcoes?.empreendimentos) return [];
    if (!buscaEmpreendimento) return dadosOpcoes.empreendimentos;
    return dadosOpcoes.empreendimentos.filter(e =>
      e.nome.toLowerCase().includes(buscaEmpreendimento.toLowerCase())
    );
  }, [dadosOpcoes?.empreendimentos, buscaEmpreendimento]);

  // Limpar todos os filtros
  const handleLimpar = () => {
    setPresetSelecionado('mes');
    setBuscaBeneficiario('');
    setBuscaEmpreendimento('');
    setStatusSelecionados([]);

    const preset = PRESETS_PERIODO.find(p => p.value === 'mes');
    const range = preset?.getRange() || { inicio: new Date(), fim: new Date() };

    onChange({
      periodoInicio: range.inicio,
      periodoFim: range.fim,
    });

    onLimpar?.();
  };

  // Contar filtros ativos
  const filtrosAtivos = [
    filtros.beneficiarioId,
    filtros.empreendimentoId,
    filtros.status && filtros.status.length > 0,
  ].filter(Boolean).length;

  const statusOptions = dadosOpcoes?.statusOptions || STATUS_OPTIONS;

  if (compacto) {
    return (
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        {/* Preset de periodo compacto */}
        {opcoes.mostrarPeriodo && (
          <Select value={presetSelecionado} onValueChange={handlePresetChange}>
            <SelectTrigger className="w-[140px] h-8">
              <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              {PRESETS_PERIODO.map(preset => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Beneficiario compacto */}
        {opcoes.mostrarBeneficiario && dadosOpcoes?.beneficiarios && (
          <Select
            value={filtros.beneficiarioId || ''}
            onValueChange={value =>
              onChange({ ...filtros, beneficiarioId: value || undefined })
            }
          >
            <SelectTrigger className="w-[160px] h-8">
              <SelectValue placeholder="Beneficiario" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {dadosOpcoes.beneficiarios.map(b => (
                <SelectItem key={b.id} value={b.id}>
                  {b.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Empreendimento compacto */}
        {opcoes.mostrarEmpreendimento && dadosOpcoes?.empreendimentos && (
          <Select
            value={filtros.empreendimentoId || ''}
            onValueChange={value =>
              onChange({ ...filtros, empreendimentoId: value || undefined })
            }
          >
            <SelectTrigger className="w-[160px] h-8">
              <SelectValue placeholder="Empreendimento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {dadosOpcoes.empreendimentos.map(e => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {filtrosAtivos > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLimpar}
            className="h-8 px-2 text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header com contador de filtros */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros</span>
          {filtrosAtivos > 0 && (
            <Badge variant="secondary" className="text-xs">
              {filtrosAtivos} ativo{filtrosAtivos > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        {filtrosAtivos > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLimpar}
            className="h-8 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Limpar filtros
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Filtro de Periodo */}
        {opcoes.mostrarPeriodo && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Periodo</Label>
            <Select value={presetSelecionado} onValueChange={handlePresetChange}>
              <SelectTrigger>
                <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Selecione o periodo" />
              </SelectTrigger>
              <SelectContent>
                {PRESETS_PERIODO.map(preset => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Campos de data para periodo personalizado */}
            {presetSelecionado === 'custom' && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <Label className="text-xs text-muted-foreground">De</Label>
                  <Input
                    type="date"
                    value={
                      filtros.periodoInicio
                        ? format(filtros.periodoInicio, 'yyyy-MM-dd')
                        : ''
                    }
                    onChange={e => handleDateChange('periodoInicio', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Ate</Label>
                  <Input
                    type="date"
                    value={
                      filtros.periodoFim
                        ? format(filtros.periodoFim, 'yyyy-MM-dd')
                        : ''
                    }
                    onChange={e => handleDateChange('periodoFim', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            )}

            {/* Mostrar periodo selecionado */}
            {filtros.periodoInicio && filtros.periodoFim && presetSelecionado !== 'custom' && (
              <div className="text-xs text-muted-foreground mt-1">
                {format(filtros.periodoInicio, 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                {format(filtros.periodoFim, 'dd/MM/yyyy', { locale: ptBR })}
              </div>
            )}
          </div>
        )}

        {/* Filtro de Beneficiario */}
        {opcoes.mostrarBeneficiario && dadosOpcoes?.beneficiarios && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Beneficiario</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                >
                  {filtros.beneficiarioId
                    ? dadosOpcoes.beneficiarios.find(
                        b => b.id === filtros.beneficiarioId
                      )?.nome || 'Selecionar...'
                    : 'Todos os beneficiarios'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0">
                <div className="flex items-center border-b px-3">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar beneficiario..."
                    value={buscaBeneficiario}
                    onChange={e => setBuscaBeneficiario(e.target.value)}
                    className="border-0 focus-visible:ring-0 h-9"
                  />
                </div>
                <div className="max-h-[200px] overflow-y-auto p-1">
                  <div
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-accent',
                      !filtros.beneficiarioId && 'bg-accent'
                    )}
                    onClick={() => onChange({ ...filtros, beneficiarioId: undefined })}
                  >
                    {!filtros.beneficiarioId && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                    <span className={!filtros.beneficiarioId ? 'ml-0' : 'ml-6'}>
                      Todos os beneficiarios
                    </span>
                  </div>
                  {beneficiariosFiltrados.map(b => (
                    <div
                      key={b.id}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-accent',
                        filtros.beneficiarioId === b.id && 'bg-accent'
                      )}
                      onClick={() => onChange({ ...filtros, beneficiarioId: b.id })}
                    >
                      {filtros.beneficiarioId === b.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                      <span className={filtros.beneficiarioId === b.id ? 'ml-0' : 'ml-6'}>
                        {b.nome}
                      </span>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Filtro de Empreendimento */}
        {opcoes.mostrarEmpreendimento && dadosOpcoes?.empreendimentos && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Empreendimento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                >
                  {filtros.empreendimentoId
                    ? dadosOpcoes.empreendimentos.find(
                        e => e.id === filtros.empreendimentoId
                      )?.nome || 'Selecionar...'
                    : 'Todos os empreendimentos'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0">
                <div className="flex items-center border-b px-3">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar empreendimento..."
                    value={buscaEmpreendimento}
                    onChange={e => setBuscaEmpreendimento(e.target.value)}
                    className="border-0 focus-visible:ring-0 h-9"
                  />
                </div>
                <div className="max-h-[200px] overflow-y-auto p-1">
                  <div
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-accent',
                      !filtros.empreendimentoId && 'bg-accent'
                    )}
                    onClick={() => onChange({ ...filtros, empreendimentoId: undefined })}
                  >
                    {!filtros.empreendimentoId && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                    <span className={!filtros.empreendimentoId ? 'ml-0' : 'ml-6'}>
                      Todos os empreendimentos
                    </span>
                  </div>
                  {empreendimentosFiltrados.map(e => (
                    <div
                      key={e.id}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-accent',
                        filtros.empreendimentoId === e.id && 'bg-accent'
                      )}
                      onClick={() => onChange({ ...filtros, empreendimentoId: e.id })}
                    >
                      {filtros.empreendimentoId === e.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                      <span className={filtros.empreendimentoId === e.id ? 'ml-0' : 'ml-6'}>
                        {e.nome}
                      </span>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Filtro de Status (Multi-select) */}
        {opcoes.mostrarStatus && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                >
                  {statusSelecionados.length > 0
                    ? `${statusSelecionados.length} selecionado${
                        statusSelecionados.length > 1 ? 's' : ''
                      }`
                    : 'Todos os status'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-1">
                {statusOptions.map(status => (
                  <div
                    key={status.value}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-accent',
                      statusSelecionados.includes(status.value) && 'bg-accent'
                    )}
                    onClick={() => handleStatusToggle(status.value)}
                  >
                    <div
                      className={cn(
                        'h-4 w-4 border rounded flex items-center justify-center',
                        statusSelecionados.includes(status.value)
                          ? 'bg-primary border-primary'
                          : 'border-muted-foreground'
                      )}
                    >
                      {statusSelecionados.includes(status.value) && (
                        <Check className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    <span>{status.label}</span>
                  </div>
                ))}
              </PopoverContent>
            </Popover>

            {/* Badges dos status selecionados */}
            {statusSelecionados.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {statusSelecionados.map(s => {
                  const statusConfig = statusOptions.find(opt => opt.value === s);
                  return (
                    <Badge
                      key={s}
                      variant="secondary"
                      className="text-xs cursor-pointer hover:bg-destructive/20"
                      onClick={() => handleStatusToggle(s)}
                    >
                      {statusConfig?.label || s}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default RelatorioFiltros;
