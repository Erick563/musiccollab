#!/bin/bash

# Script para executar testes do MusicCollab
# Uso: ./run-tests.sh [backend|frontend|all|coverage]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}========================================${NC}\n"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Função para rodar testes do backend
run_backend_tests() {
    print_header "Executando Testes do Backend"
    cd server
    npm test
    cd ..
    print_success "Testes do backend concluídos!"
}

# Função para rodar testes do frontend
run_frontend_tests() {
    print_header "Executando Testes do Frontend"
    cd client
    CI=true npm test -- --watchAll=false
    cd ..
    print_success "Testes do frontend concluídos!"
}

# Função para rodar testes com cobertura
run_coverage_tests() {
    print_header "Executando Testes com Cobertura"
    
    print_info "Backend Coverage..."
    cd server
    npm run test:coverage
    cd ..
    
    print_info "Frontend Coverage..."
    cd client
    CI=true npm test -- --coverage --watchAll=false
    cd ..
    
    print_success "Relatórios de cobertura gerados!"
    print_info "Backend: server/coverage/index.html"
    print_info "Frontend: client/coverage/lcov-report/index.html"
}

# Função para rodar todos os testes
run_all_tests() {
    print_header "Executando Todos os Testes"
    run_backend_tests
    run_frontend_tests
    print_success "Todos os testes concluídos!"
}

# Menu principal
case "$1" in
    backend)
        run_backend_tests
        ;;
    frontend)
        run_frontend_tests
        ;;
    coverage)
        run_coverage_tests
        ;;
    all|"")
        run_all_tests
        ;;
    *)
        echo "Uso: $0 [backend|frontend|all|coverage]"
        echo ""
        echo "Opções:"
        echo "  backend   - Executa apenas testes do backend"
        echo "  frontend  - Executa apenas testes do frontend"
        echo "  all       - Executa todos os testes (padrão)"
        echo "  coverage  - Executa testes com relatório de cobertura"
        exit 1
        ;;
esac

