# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## ⚡ FIRST: Read system.md

**Before doing anything else**, read and execute the startup actions in [`system.md`](./system.md).

That file contains:
- **REQUIRED** background processes you must start immediately
- Git workflow rules (fetch & rebase, never pull)
- Inter-agent communication protocol
- Your role and identity as an autonomous agent

**Do not skip this step.**

---

## Project Overview

This is the **MOLE Inference Web Interface** - a Next.js web application that provides a user-friendly interface for testing and interacting with the MOLE (Mixture of Experts Language Engine) inference server.

### Purpose

The MOLE inference server routes screenshots to specialized expert LoRA adapters based on screen classification. This web interface allows users to:
- Upload screenshots for inference
- View routing decisions (which expert was selected)
- See model predictions and confidence scores
- Monitor server health and status
- Test the MoE system end-to-end

### Tech Stack

- **Framework**: Next.js 16.1.0 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **Runtime**: Node.js 18+

### Architecture

This is a client-server application:
- **Frontend**: React components with Next.js App Router
- **Backend**: Next.js API routes that proxy requests to the Modal MOLE inference server
- **Authentication**: Simple auth system to protect the interface

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── auth/           # Authentication endpoints
│   ├── login/              # Login page
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Main inference interface
├── components/
│   ├── ImageDropzone.tsx   # Drag-and-drop image upload
│   ├── InferencePanel.tsx  # Results display
│   └── ServerStatus.tsx    # Server health indicator
├── lib/
│   ├── api.ts              # API client utilities
│   └── types.ts            # TypeScript type definitions
└── proxy.ts                # Modal inference server proxy
```

## Development

### Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Configure .env.local with:
# - NEXT_PUBLIC_API_URL (Modal inference endpoint)
# - AUTH_PASSWORD (admin password)
```

### Running Locally

```bash
npm run dev
# Opens at http://localhost:3000
```

### Building

```bash
npm run build
npm start
```

## Integration with MOLE System

This web interface connects to:
- **mole-inference** (Modal): The inference server that hosts the router and expert adapters
- **AdapterRegistry**: Uses adapter configs from `config/adapters.yaml` in the root

The interface sends screenshots to the inference server and displays:
1. Router decision (which expert to use)
2. Expert prediction (action and coordinates)
3. Confidence scores
4. Execution time

## Environment Variables

Required in `.env.local`:

```env
NEXT_PUBLIC_API_URL=https://your-modal-deployment.modal.run
AUTH_PASSWORD=your-secure-password
```

## Deployment

This Next.js app can be deployed to Vercel:

```bash
vercel deploy
```

Ensure environment variables are configured in Vercel project settings.

## Related Projects

- **projects/sl/mole-inference**: The Modal inference server backend
- **projects/sl/lora-trainer**: Trains the expert adapters
- **config/adapters.yaml**: Single source of truth for adapter configuration

## Code Quality

Follow the repository-wide standards in `CODE_QUALITY.md` at the root:
- TypeScript strict mode enabled
- ESLint configured with Next.js rules
- Functional components with hooks
- Proper error handling in API routes

## Development Notes

- Uses Next.js 16 App Router (not Pages Router)
- All API routes are in `src/app/api/`
- Client components must use `'use client'` directive
- Server components by default (no directive needed)
