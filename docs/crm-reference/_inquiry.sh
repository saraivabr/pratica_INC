#!/bin/bash

get_frontend_url() {
  print_banner
  printf "${WHITE} 💻 Digite o domínio da interface web (Frontend):${GRAY_LIGHT}"
  printf "\n\n"
  read -p "> " frontend_url
}

get_backend_url() {
  print_banner
  printf "${WHITE} 💻 Digite o domínio da sua API (Backend):${GRAY_LIGHT}"
  printf "\n\n"
  read -p "> " backend_url
}

get_urls() {
  get_deploy_email
  get_frontend_url
  get_backend_url
}

get_tenant_url() {
  print_banner
  printf "${WHITE} 💻 Digite o domínio da interface web da página de criação de empresas:${GRAY_LIGHT}"
  printf "\n\n"
  read -p "> " tenant_url
}

get_api_url() {
  print_banner
  printf "${WHITE} 💻 Digite o domínio da sua API gerada na pelo superadmin:${GRAY_LIGHT}"
  printf "\n\n"
  read -p "> " api_url
}

get_tenant_token() {
  print_banner
  printf "${WHITE} 💻 Digite o token de acesso gerado na pelo superadmin:${GRAY_LIGHT}"
  printf "\n\n"
  read -p "> " tenant_token
}

get_deploy_email() {
  print_banner
  printf "${WHITE} 💻 Digite o email para o certbot:${GRAY_LIGHT}"
  printf "\n\n"
  read -p "> " deploy_email
}

get_tenant_data() {
  get_tenant_url
  get_api_url
  get_tenant_token
  get_deploy_email
}

software_update() {
  update_node_install
  system_puppeteer_dependencies
  update_bd_update
  update_stop_pm2
  update_mv_zpro
  update_delete_backend
  update_delete_frontend
  update_tos
  update_unzip_zpro
  update_check_frontend_index
  update_delete_zip
  update_backend_node_dependencies
  update_backend_db_migrate
  # update_backend_db_seed
  update_frontend_node_dependencies
  update_frontend_node_build
  update_start_pm2
  install_firewall
  update_success
}

software_migration() {
  migration_node_install
  migration_bd_update
  migration_stop_pm2
  migration_mv_zpro
  migration_delete_backend
  migration_delete_frontend
  migration_unzip_zpro
  migration_delete_zip
  migration_backend_node_dependencies
  migration_backend_db_migrate
  migration_backend_db_seed
  migration_backend_start_pm2
  migration_frontend_node_dependencies
  migration_frontend_node_build
  migration_frontend_start_pm2
  install_firewall
  migration_success
}

wweb_js() {
  wwebjs_node_install
  wwebjs_stop_pm2
  wwebjs_delete_backend
  wwebjs_update_api
  wwebjs_reboot
}

pending_fix() {
  pending_node_install
  pending_stop_pm2
  pending_mv_fix
  pending_delete_service
  pending_unzip_fix
  pending_delete_zip
  pending_restart_pm2
}

tenant() {
  get_tenant_data
  tenant_copy_zip
  tenant_unzip
  tenant_set_env
  tenant_install
  tenant_start_pm2
  tenant_nginx_setup  
  tenant_delete_zip
  tenant_certbot_setup
  install_firewall
  tenant_success
}

redis(){
  docker_list_and_kill_redis
  create_redis_service
  check_redis_status
  redis_start_pm2
}

portainer_management() {
  print_banner
  printf "${WHITE} 💻 O que você deseja fazer com o Portainer?${GRAY_LIGHT}"
  printf "\n\n"
  printf "  [1] Reiniciar o Portainer\n"
  printf "  [2] Remover o Portainer e seus volumes\n"
  printf "  [3] Recriar o Portainer\n"
  printf "  [0] Voltar ao menu anterior\n"
  printf "\n\n"
  read -p "> " portainer_option

  case "${portainer_option}" in
    1) 
      portainer_restart
      ask_continue
      ;;
    2) 
      portainer_remove
      ask_continue
      ;;
    3) 
      portainer_recreate
      ask_continue
      ;;
    0) 
      inquiry_options
      ;;
    *) 
      portainer_management
      ;;
  esac
}

monitoring_setup() {
  print_banner
  printf "${WHITE} 💻 O que você deseja configurar no monitoramento?${GRAY_LIGHT}"
  printf "\n\n"
  printf "  [1] Instalar e configurar Prometheus\n"
  printf "  [2] Instalar e configurar Grafana\n"
  printf "  [3] Configurar ambos\n"
  printf "  [0] Voltar ao menu anterior\n"
  printf "\n\n"
  read -p "> " monitoring_option

  case "${monitoring_option}" in
    1) 
      setup_prometheus
      ask_continue
      ;;
    2) 
      setup_grafana
      ask_continue
      ;;
    3) 
      setup_prometheus
      setup_grafana
      ask_continue
      ;;
    0) 
      inquiry_options
      ;;
    *) 
      monitoring_setup
      ;;
  esac
}

advanced_settings() {
  print_banner
  printf "${WHITE} 💻 O que você deseja configurar?${GRAY_LIGHT}"
  printf "\n\n"
  printf "  [1] Configurar backup personalizado\n"
  printf "  [2] Configurar Rate Limiting\n"
  printf "  [3] Configurar Fail2ban\n"
  printf "  [4] Configurar Health Check\n"
  printf "  [5] Configurar Firewall\n"
  printf "  [6] Configurar tudo\n"
  printf "  [0] Voltar ao menu anterior\n"
  printf "\n\n"
  read -p "> " advanced_option

  case "${advanced_option}" in
    1) 
      setup_backup
      ask_continue
      ;;
    2) 
      setup_rate_limiting
      ask_continue
      ;;
    3) 
      setup_fail2ban
      ask_continue
      ;;
    4) 
      setup_health_check
      ask_continue
      ;;
    5) 
      setup_firewall
      ask_continue
      ;;
    6)
      setup_backup
      setup_rate_limiting
      setup_fail2ban
      setup_health_check
      setup_firewall
      ask_continue
      ;;
    0) 
      inquiry_options
      ;;
    *) 
      advanced_settings
      ;;
  esac
}

# Função para perguntar se quer continuar ou sair
ask_continue() {
  printf "\n\n"
  printf "${WHITE} Pressione ENTER para continuar ou digite 'sair' para encerrar:${GRAY_LIGHT}"
  printf "\n\n"
  read -p "> " choice
  if [ "$choice" = "sair" ]; then
    exit
  else
    inquiry_options
  fi
}

inquiry_options() {
  
  print_banner
  printf "${WHITE} 💻 O que você precisa fazer?${GRAY_LIGHT}"
  printf "\n\n"
  printf "${GREEN} Antes de atualizar ou migrar, é obrigatório criar um snapshot (ponto de restauração) da sua VPS${NC}"
  printf "\n\n"
  printf "  [1] Instalar ZPRO\n"
  printf "  [2] Atualizar ZPRO para última versão\n"
  printf "  [3] Instalar instâncias secundárias ZPRO\n"
  printf "  [4] Atualizar instâncias secundárias ZPRO\n"
  printf "  [5] Instalar Webchat\n"
  printf "  [6] Alterar Subdomínio\n"
  printf "  [7] Gerenciar Portainer\n"
  printf "  [8] Recriar Redis\n"
  printf "  [9] Configurar Firewall\n"
  printf "  [10] Configurar Monitoramento\n"
  printf "  [11] Definir Deployzdg como dono das pastas ZPRO\n"
  printf "  [0] Instalar interface para criação de empresa\n"
  printf "\n"
  printf "\n\n"
  read -p "> " option

  case "${option}" in
    1) 
      get_urls
      # ask_continue
      ;;

    2) 
      software_update
      ask_continue
      ;;
	
    3) 
      cd /root/zpro_passaporte_shell/multi
      chmod +x zpro
      bash zpro
      ask_continue
      ;;

    4) 
      update_all_instances
      update_instances_success
      ask_continue
      ;;

    5)
      install_webchat
      ask_continue
      ;;

    6)
      change_subdomain
      ask_continue
      ;;

    7) 
      portainer_management
      ask_continue
      ;;

    8) 
      recreate_redis
      ask_continue
      ;;

    9) 
      setup_firewall
      ask_continue
      ;;

    10) 
      monitoring_setup
      ask_continue
      ;;

    11)
      set_folder_owner
      ask_continue
      ;;

    0) 
      tenant
      ask_continue
      ;;

    *) 
      ask_continue
      ;;
  esac
}

#######################################
# Define o dono de todas as pastas para deployzdg
# Arguments:
#   None
#######################################
set_folder_owner() {
  print_banner
  printf "${WHITE} 💻 Definindo dono das pastas para deployzdg em /home/deployzdg/...${GRAY_LIGHT}"
  printf "\n\n"

  sleep 2

  sudo su - root <<EOF
  chown -R deployzdg:deployzdg /home/deployzdg
  printf "${GREEN} ✅ Dono das pastas atualizado com sucesso!${NC}\n"
  printf "\n"
  printf "${WHITE} 📊 Resumo das alterações:${GRAY_LIGHT}\n"
  printf "  • Novo dono: deployzdg:deployzdg\n"
  printf "  • Diretório: /home/deployzdg\n"
EOF

  sleep 2
}

