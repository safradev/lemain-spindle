const USER_MESSAGES = {
  invalidLink: "Não encontramos um vídeo nesse link. Confira e tente de novo.",
  unavailable: "Este vídeo não está disponível para extração.",
  missingTool: "Faltou um componente do sistema para finalizar o arquivo.",
  network: "A conexão falhou. Verifique a internet e tente novamente.",
  permission: "Sem permissão para salvar nesta pasta. Escolha outro destino.",
  invalidParams: "Não foi possível iniciar. Confira o link, o formato e a pasta.",
  motor: "O motor do Spindle não iniciou. Feche o antivírus temporariamente ou reinstale o app.",
  generic: "Algo deu errado. Tente novamente.",
} as const;

const RULES: Array<{ test: RegExp; message: string }> = [
  {
    test: /identificar o v[ií]deo|invalid ?url|url inv[aá]lida|unsupported|n[aã]o [eé] um link|somente links do youtube|informe um link/i,
    message: USER_MESSAGES.invalidLink,
  },
  {
    test: /private|sign in|login|unavailable|n[aã]o est[aá] dispon[ií]vel|playlist vazia/i,
    message: USER_MESSAGES.unavailable,
  },
  {
    test: /ffmpeg/i,
    message: USER_MESSAGES.missingTool,
  },
  {
    test: /network|timed? ?out|timeout|econnreset|enotfound|offline/i,
    message: USER_MESSAGES.network,
  },
  {
    test: /permission|permiss[aã]o|eacces|eperm|escrita/i,
    message: USER_MESSAGES.permission,
  },
  {
    test: /par[aâ]metros|formato de m[ií]dia inv[aá]lido|pasta de destino/i,
    message: USER_MESSAGES.invalidParams,
  },
  {
    test: /motor|embutido|python encerrou|enoent|spawn|indispon[ií]vel/i,
    message: USER_MESSAGES.motor,
  },
];

function extractRawMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (error && typeof error === "object") {
    const record = error as { message?: unknown; error?: unknown };
    if (typeof record.message === "string") {
      return record.message;
    }
    if (typeof record.error === "string") {
      return record.error;
    }
  }
  return "";
}

function stripTechnicalWrappers(message: string): string {
  return message
    .replace(/^Error invoking remote method '[^']+':\s*/gi, "")
    .replace(/^Error invoking remote method "[^"]+":\s*/gi, "")
    .replace(/^Error:\s*/gi, "")
    .replace(/\bError:\s*/gi, "")
    .trim();
}

export function toUserFacingError(error: unknown): string {
  const raw = stripTechnicalWrappers(extractRawMessage(error));
  if (!raw) {
    return USER_MESSAGES.generic;
  }

  for (const rule of RULES) {
    if (rule.test.test(raw)) {
      return rule.message;
    }
  }

  return USER_MESSAGES.generic;
}

export function userFacingError(error: unknown): Error {
  return new Error(toUserFacingError(error));
}
