'use client';

import { useState, useMemo } from 'react';
import {
  MessageTemplate,
  TemplateCategory,
  TEMPLATE_CATEGORIES,
  DEFAULT_TEMPLATES,
  searchTemplates,
  applyTemplateVariables,
} from '@/lib/whatsapp-templates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { MessageSquareText, Search, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplatesPickerProps {
  contactName?: string;
  onSelect: (message: string) => void;
  className?: string;
}

interface VariableInputs {
  [key: string]: string;
}

export function WhatsAppTemplatesPicker({
  contactName,
  onSelect,
  className,
}: TemplatesPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>('saudacao');
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [variableInputs, setVariableInputs] = useState<VariableInputs>({});

  // Filtrar templates
  const filteredTemplates = useMemo(() => {
    if (searchQuery) {
      return searchTemplates(searchQuery);
    }
    return DEFAULT_TEMPLATES.filter((t) => t.category === selectedCategory);
  }, [searchQuery, selectedCategory]);

  // Handlers
  const handleSelectTemplate = (template: MessageTemplate) => {
    setSelectedTemplate(template);

    // Pré-preencher nome do contato se disponível
    const initialVars: VariableInputs = {};
    template.variables?.forEach((v) => {
      if (v === 'nome' && contactName) {
        initialVars[v] = contactName;
      } else {
        initialVars[v] = '';
      }
    });
    setVariableInputs(initialVars);
  };

  const handleVariableChange = (variable: string, value: string) => {
    setVariableInputs((prev) => ({ ...prev, [variable]: value }));
  };

  const handleSend = () => {
    if (!selectedTemplate) return;

    const message = applyTemplateVariables(selectedTemplate.message, variableInputs);
    onSelect(message);
    setOpen(false);
    setSelectedTemplate(null);
    setVariableInputs({});
    setSearchQuery('');
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedTemplate(null);
    setVariableInputs({});
    setSearchQuery('');
  };

  // Preview da mensagem com variáveis preenchidas
  const previewMessage = useMemo(() => {
    if (!selectedTemplate) return '';
    return applyTemplateVariables(selectedTemplate.message, variableInputs);
  }, [selectedTemplate, variableInputs]);

  // Verificar se todas as variáveis estão preenchidas
  const allVariablesFilled = useMemo(() => {
    if (!selectedTemplate?.variables) return true;
    return selectedTemplate.variables.every((v) => variableInputs[v]?.trim());
  }, [selectedTemplate, variableInputs]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('text-gray-500 hover:text-emerald-600', className)}
          title="Mensagens rápidas"
        >
          <MessageSquareText className="w-5 h-5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareText className="w-5 h-5 text-emerald-600" />
            Mensagens Rápidas
          </DialogTitle>
        </DialogHeader>

        {/* Se um template foi selecionado, mostrar editor de variáveis */}
        {selectedTemplate ? (
          <div className="p-4 space-y-4">
            {/* Header do template selecionado */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedTemplate.emoji}</span>
                <h3 className="font-semibold">{selectedTemplate.name}</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedTemplate(null)}>
                <X className="w-4 h-4 mr-1" />
                Voltar
              </Button>
            </div>

            {/* Inputs para variáveis */}
            {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
              <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-500 font-medium">Preencha os campos:</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedTemplate.variables.map((variable) => (
                    <div key={variable} className="space-y-1">
                      <Label htmlFor={variable} className="text-xs capitalize">
                        {variable.replace(/_/g, ' ')}
                      </Label>
                      <Input
                        id={variable}
                        value={variableInputs[variable] || ''}
                        onChange={(e) => handleVariableChange(variable, e.target.value)}
                        placeholder={`Digite ${variable}`}
                        className="h-9"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            <div className="space-y-2">
              <p className="text-sm text-gray-500 font-medium">Preview:</p>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <p className="whitespace-pre-wrap text-sm">{previewMessage}</p>
              </div>
            </div>

            {/* Botão enviar */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleSend}
                disabled={!allVariablesFilled}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Usar mensagem
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Busca */}
            <div className="p-4 pb-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar mensagem..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Categorias e Templates */}
            <Tabs
              value={searchQuery ? 'search' : selectedCategory}
              onValueChange={(v) => {
                if (v !== 'search') {
                  setSelectedCategory(v as TemplateCategory);
                  setSearchQuery('');
                }
              }}
              className="flex-1"
            >
              {!searchQuery && (
                <TabsList className="w-full justify-start gap-1 p-1 h-auto flex-wrap bg-transparent border-b rounded-none px-4">
                  {Object.entries(TEMPLATE_CATEGORIES).map(([key, { label, emoji }]) => (
                    <TabsTrigger
                      key={key}
                      value={key}
                      className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700 rounded-full px-3 py-1.5 text-xs"
                    >
                      {emoji} {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              )}

              <ScrollArea className="h-[300px]">
                <div className="p-4 space-y-2">
                  {filteredTemplates.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquareText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>Nenhum template encontrado</p>
                    </div>
                  ) : (
                    filteredTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        className="w-full p-3 text-left rounded-lg border border-gray-200 dark:border-gray-700 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors group"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl">{template.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm group-hover:text-emerald-700">
                              {template.name}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {template.message}
                            </p>
                            {template.variables && template.variables.length > 0 && (
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {template.variables.map((v) => (
                                  <span
                                    key={v}
                                    className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-500"
                                  >
                                    {`{{${v}}}`}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default WhatsAppTemplatesPicker;
