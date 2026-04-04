# 🌿 Sistema de Gestão de Spa e Clínica
<img width="594" height="279" alt="image" src="https://github.com/user-attachments/assets/7b2bbc47-7ee5-4b87-9c73-cd6823de96ef" />


Plataforma unificada e moderna para gestão de agendamentos, equipe, clientes e serviços, projetada especificamente para Spas e Clínicas de estética/massoterapia. O sistema oferece uma interface inspirada no **Google Agenda**, com controle de perfis de acesso, formulários de anamnese clínicos e acompanhamento em tempo real.

## 🏗 Arquitetura do Projeto

O projeto adota uma arquitetura Full-Stack orientada a componentes no Frontend e uma API REST sólida no Backend, com integração direta ao banco de dados relacional.

*   **Frontend**: Responsável pela interface interativa (SPA). É servido via Vite e consome a API REST criada no backend.
*   **Backend**: Servidor Express em Node.js que gerencia toda a regra de negócio, autenticação (JWT) e orquestração do endpoint `/api` e do banco de dados (Prisma ORM).
*   **Banco de Dados**: PostgreSQL, desenhado para garantir integridade relacional entre Usuários, Clientes, Agendamentos e Serviços.

## 💻 Stack Tecnológico

### Frontend
*   **React 19** + **TypeScript**: Construção de interfaces tipadas, modulares e performáticas.
*   **Vite**: Ferramenta de build de altíssima velocidade.
*   **Tailwind CSS (v4)**: Estilização utilitária de alta customização, adotando Glassmorphism e temas dinâmicos (Light/Dark mode).
*   **Motion**: Animações fluidas de modais e painéis de componentes.
*   **Lucide React** e **Material Symbols**: Bibliotecas de iconografia.

### Backend
*   **Node.js** + **Express**: Servidor HTTP robusto e leve.
*   **Prisma ORM**: Modelagem do banco (`schema.prisma`) e migrações fortemente tipadas.
*   **PostgreSQL**: Banco de dados relacional (configurado via variável de ambiente conectada à Nuvem/Local).
*   **Bcrypt & JWT**: Criptografia de senhas no cadastro e segurança de transações via Tokens de Autorização.

---

## 🚀 Como Iniciar o Projeto (Ambiente de Desenvolvimento)

Siga as etapas abaixo para rodar o projeto e a API na sua máquina local.

### 1. Pré-requisitos
*   [Node.js](https://nodejs.org/) (versão 18 ou superior).
*   Configuração com banco **PostgreSQL** ativo via string de conexão.

### 2. Instalação das Dependências
Na raiz do projeto (`/Work/Gestão`), execute o instalador padrão do Node:
```bash
npm install
```

### 3. Configuração de Ambiente (.env)
O sistema exige instâncias de conexão seguras. Configure o arquivo `.env` na raiz do projeto com as credenciais:
```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/nomedobanco?schema=public"
JWT_SECRET="sua_chave_secreta_aqui"
```

### 4. Sincronização do Banco de Dados
Para migrar as tabelas de tabelas para o banco de dados (Aplica o `schema.prisma` real):
```bash
npx prisma db push
npx prisma generate
```

### 5. Iniciar o Servidor Backend (API)
Abra um terminal no projeto e inicie o motor do Node conectando as rotas ao DB:
```bash
npx tsx server.ts
```
*(O servidor Express normalmente escutará a porta 5000)*

### 6. Iniciar o Servidor Frontend (Interface React)
Abra um **segundo terminal** (mantenha o primeiro rodando o `server.ts`), e rode o servidor do projeto estático:
```bash
npm run dev
```
O Vite informará no terminal o link de acesso local (geralmente `http://localhost:3000`). Acesse este link no seu navegador.

---

---

## 🎯 O que o Sistema Faz? (Propósito da Plataforma)

O **Gestão de Spa e Clínica** é uma plataforma concebida para substituir o uso de cadernos e do Google Agenda tradicional em estabelecimentos de bem-estar.
O sistema consolida em um único lugar:
*   **Agendamentos Inteligentes**: Impede sobreposições de horários, calcula a duração baseada na soma dos serviços e identifica o momento atual do dia (com auto-scroll e linha de tempo).
*   **Segurança Clínica do Paciente**: Possui um sistema integrado de Anamnese Eletrônica Acoplada, salvando histórico médico (alergias, cirurgias, pinos) vinculado ao perfil do paciente.
*   **Controle Logístico**: Permite cadastrar e emitir notas/recibos direto para a impressora e enviar mensagens de confirmação automatizadas para o WhatsApp com 1 clique.

---

## 👤 Perfis de Acesso e suas Permissões (O que cada função faz)

O sistema possui uma trava rigorosa de segurança (`Role-Based Access Control`), onde o login de cada pessoa determina as telas e os botões que ela pode enxergar:

### 👑 1. Supervisor (Dono / Liderança)
É o perfil com **Acesso Total Absoluto**. Somente o Supervisor possui botões e menus para acessar o "coração" financeiro e operacional da clínica:
*   **Aba Dashboard**: Tem visão de Faturamento (R$), quantidade de serviços feitos e métricas gerais.
*   **Aba Equipe**: É a **única pessoa autorizada** a criar novos funcionários, deletá-los e definir **quais dias da semana eles trabalham** (Ex: "O Pedro só trabalha Terça e Quinta"). O Supervisor define senhas e altera os salários/especialidades de todos.
*   **Aba Serviços**: Cria, edita e deleta o portfólio de serviços oferecidos pelo Spa (Nome, Preço e Duração).
*   **Na Escala**: Pode ver todos os colaboradores, agendar serviços para qualquer um, e tem o poder de **Criar Bloqueios / Faltas** (Ex: Bloquear a agenda do Paulo das 14h às 15h porque ele "Foi ao Médico"). Clicando na tela vazia, já salta para marcações.

### 🛎️ 2. Recepcionista (Operação de Balcão)
É a "controladora de tráfego". Tem uma visão irrestrita da agenda do dia, mas **não tem acesso financeiro ou à configuração de funcionários**.
*   **Gestão de Agenda (Escala)**: Navega por todos os dias, vê a grade de todos os terapeutas/profissionais daquele dia, e enxerga todos os horários.
*   **Agendamentos Completo**: Realiza encaixes rápidos, clica na grade para criar "Novas Reservas", confirma presenças e aciona botões de edição de serviços e de imprimir recibos da Recepção.
*   **Gestão de Bloqueios**: Também pode lançar um Bloqueio/Falta na agenda para segurar horários de almoço da equipe de massoterapeutas.
*   **Base de Clientes**: Possui controle primário da aba de "Base de Clientes" inteira, onde pode cadastrar pacientes novos, excluir ou **Puxar e Editar as Recomendações e o Perfil Clínico Seguro** (Ex: Salvar para sempre que o cliente 'X' é alérgico a certo óleo para ninguém errar).

### 💆‍♂️ 3. Colaborador (Profissionais e Terapeutas)
É o perfil mais isolado por privacidade. Ele só atende, então não deve se distrair ou acessar dados corporativos e de terceiros que não lhe dizem respeito.
*   **Visão em Túnel (Minha Agenda)**: Em vez de ver todas as colunas de todos os profissionais, ele vê **apenas a própria coluna** do dia selecionado. Ele não interage com, nem vê os clientes agendados para outros colegas.
*   **Notificações Limpas**: Ele tem o painel simplificado que foca em olhar seu horário atual, e checar alertas como "Lembretes de Amanhã (Seus)".
*   **Ações Restritas**: O Colaborador não cria bloqueios (não pode faltar pelo sistema) e não edita serviços ou clientes do zero. Sua única tarefa é consultar a própria carga de trabalho diária e, se necessário, fechar ou acompanhar informações da ficha do paciente agendado pela Recepção.

---

## 🛠 Outras Funcionalidades Essenciais

*   **Linha do Tempo Bidimensional**: Escala de visualização (34 pixels por hora).
*   **Ficha Clínica (Anamnese Eletrônica)**: Modal inteligente que capta até 20 restrições.
*   **Inteligência de "Cliente Retornante"**: Se um cliente antigo voltar, ao buscar seu nome, sua ficha (da Base de Clientes da Recepcionista) mostra todos os avisos em tempo real ao agendar.

---

## 🧪 Guia Rápido de Uso e Testes (Hands-on)

Se você quiser validar as funcionalidades principais, siga este roteiro prático que testa o núcleo de inteligência do sistema:

### 1. Painel Admin & Adicionar Serviços com Tempo (Duração)
*   Entre no sistema usando a conta de **Supervisor**.
*   No menu, clique na aba **"🌟 Serviços"**.
*   Você vai ver um painel completo (Menu de Serviços). Ali na direita tem o formulário "Adicionar Novo Serviço", e o campo **"Duração (Min)"** já está lá! Você pode colocar `60`, `90`, `120` minutos, etc. Quando você salva, o sistema registra exatamente o tempo de cada serviço e usa isso na agenda!

### 2. Agendamento com Horários Disponíveis (Cálculo de Tempo)
*   Toda vez que a agendar e selecionar `"Massagem (60) + Limpeza de Pele (30)"`, o sistema calcula sozinho que aquele atendimento vai durar 90 minutos.
*   Ele desenha o tamanho exato na tela e **bloqueia** o profissional durante aquele tempo exato na grade de horários, impedindo conflitos.

### 3. Notificações por SMS/WhatsApp
*   Assim que um agendamento é criado, clique no bloco verde dele na grade da agenda. Isso vai abrir um menu com detalhes extras (modal).
*   Lá dentro, tem um botão com o ícone do **WhatsApp** ("Enviar Confirmação"). Ele gera uma mensagem automática completinha (Dia, Hora, Profissional, Preço) e redireciona direto pro cliente com 1 clique.

> **✅ Teste Rápido sugerido:** 
> Faça login como **Supervisor**, vá na aba **Serviços**, cadastre um tratamento novo chamado *"Spa Day Teste"* e coloque a Duração de **120 minutos**. Depois, vá na **Escala** (grade da agenda) e tente agendar ele pra ver o sistema criando matematicamente o bloco grandão de 2 horas ocupando o espaço na tela!

---

## 🔀 Rotas da API e Endpoints Principais

A camada de backend (`routes.ts`) expõe as seguintes rotas protegidas (Validadas via JWT Middleware):

*   **Autenticação**:
    *   `POST /api/login`: Valida criptografia Bcrypt e devolve o token de sessão e os dados essenciais (Nome, Papel/Role).
    *   `GET  /api/verify-token`: Renova ou confirma que a sessão do usuário ainda é válida.
*   **Gestão de Pessoas**:
    *   `GET | POST | PUT | DELETE /api/equipe`: Controla a base de funcionários, senhas e dias úteis de trabalho de cada colaborador da escala.
    *   `GET | POST | PUT | DELETE /api/clientes`: Central de cadastros contendo `nome`, `telefone` e a master string de `observacao` (o perfil clínico fixo).
*   **Operações de Agenda**:
    *   `GET | POST | PUT | DELETE /api/agendamentos`: Motor principal de marcações. Trabalha recebendo o id do profissional, serviços e cruza o cruzamento na linha do tempo.
    *   `GET | POST | DELETE /api/bloqueios`: Motor auxiliar para registro de pausas, horário de almoço ou atestados na agenda para bloquear disponibilidade.
*   **Serviços e Finanças**:
    *   `GET | POST | PUT | DELETE /api/servicos`: Tabelas de preço, tempo médio e descrições do escopo terapêutico.

---

## 🧱 Funções Utilitárias do Código (`appointmentUtils.ts` / Frontend)

Para reduzir duplicação de escopo e organizar lógicas complexas, o sistema utiliza funções extraídas que calculam e processam eventos no front-end:

*   `hasOverlap(date, time, empId, services, ...)`: O "cérebro" das checagens da agenda. Essa função impede que haja **choques/conflitos de horários**, interceptando e parando qualquer agendamento duplo tentando entrar sobre o tempo de duração que um serviço já exige.
*   `getDuration(selectedServices, services)`: Loop numérico que entende quais serviços o cliente mesclou e retorna a soma em minutos/horas necessários.
*   `getLocalTodayString()`: Utilitário para formatação exata de horários (Iso Date + Timezone fixing).
*   `handleSendReceiptWhatsApp()`: Constrói uma mensagem pronta, rica em texto (Data, Hora, Profissional, e Preço) e redireciona o Recepcionista direto para a tela do _WhatsApp Web_ em um único clique!
*   `handlePrintAppointment()`: Transforma os dados numa etiqueta formatada e aciona a infraestrutura do navegador para acionar Impressoras Térmicas ou A4 (Comprovante em papel).
