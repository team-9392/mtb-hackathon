import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  approveQuestApi,
  completeQuestApi,
  createChildApi,
  createRequestApi,
  depositGoalApi,
  issueCardApi,
  openAccountApi,
  patchCardApi,
  patchLimitsApi,
  patchOperationApi,
  patchPermissionApi,
  resolveRequestApi,
  setAccessApi,
  signConsentsApi,
  topUpApi,
  transferApi,
} from "@/api/actions";
import { useRealtime } from "@/api/realtime";
import { loadChildState, loadParentState } from "@/api/sync";
import { useAuth } from "@/auth/AuthProvider";

import { L, buildConsents, buildPermissions, initialState } from "./mock";
import type {
  AccessRequest,
  AccountKind,
  AgeBracket,
  AppNotification,
  CardSystem,
  CardType,
  ChildProfile,
  ConsentId,
  FamilyState,
  LimitState,
  Localized,
  OperationId,
  ProductId,
  Role,
} from "./types";

interface StoreValue {
  state: FamilyState;
  toast: string | null;
  showToast: (message: string) => void;
  setRole: (role: Role | null) => void;
  setChild: (patch: Partial<ChildProfile>) => void;
  setBracket: (bracket: AgeBracket) => void;
  toggleConsent: (id: ConsentId) => void;
  signAllConsents: () => void;
  issueProducts: () => void;
  /** Выпуск карты с выбранным типом и платёжной системой. */
  issueCard: (type: CardType, system: CardSystem) => Promise<boolean>;
  grantAccess: () => void;
  revokeAccess: () => void;
  togglePermission: (id: ProductId | OperationId) => void;
  updateLimits: (patch: Partial<LimitState>) => void;
  /** Открыть счёт: доступно сразу либо через запрос родителю. */
  openAccount: (kind: AccountKind) => Promise<"opened" | "requested">;
  /** Перевод между своими счетами. */
  moveMoney: (from: AccountKind | "goal", to: AccountKind | "goal", amount: number) => Promise<boolean>;
  /** Родитель переводит деньги ребёнку на карман. */
  topUpChild: (amount: number) => Promise<boolean>;
  toggleCardBlock: () => void;
  completeQuest: (id: string) => void;
  approveQuest: (id: string) => void;
  addToGoal: (amount: number) => void;
  requestAccess: (target: ProductId | "limit", label: Localized) => void;
  resolveRequest: (id: string, approve: boolean) => void;
  pushNotification: (n: { title: Localized; body: Localized; kind: AppNotification["kind"] }) => void;
  reset: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

let seq = 500;
const nextId = (prefix: string): string => prefix + String(seq++);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FamilyState>(initialState);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { demoMode, status, claims } = useAuth();

  // Актуальные значения для колбэков, которые не должны пересоздаваться.
  const stateRef = useRef(state);
  stateRef.current = state;
  const idsRef = useRef<{ childId: string | null; goalId: string | null }>({ childId: null, goalId: null });
  idsRef.current = {
    childId: state.childId ?? claims?.childId ?? null,
    goalId: state.goalId ?? null,
  };

  /** Перечитать состояние с сервера. В демо-режиме ничего не делает. */
  const hydrate = useCallback(async () => {
    if (demoMode || status !== "signedIn") {
      return;
    }
    try {
      if (claims?.childId) {
        const patch = await loadChildState(claims.childId);
        setState((prev) => ({ ...prev, ...patch }));
      } else {
        const patch = await loadParentState();
        setState((prev) => ({ ...prev, ...patch }));
      }
    } catch {
      // Сервер недоступен — экраны продолжают работать на локальных данных.
    }
  }, [demoMode, status, claims?.childId]);

  const hydrateRef = useRef(hydrate);
  hydrateRef.current = hydrate;
  const demoRef = useRef(demoMode);
  demoRef.current = demoMode;

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Живой канал: любое изменение в семье — перечитываем состояние.
  useRealtime(() => {
    void hydrateRef.current();
  }, !demoMode && status === "signedIn");

  const showToastRef = useRef<((message: string) => void) | null>(null);
  const balanceOf = useCallback((snapshot: FamilyState, kind: AccountKind | "goal"): number => {
    if (kind === "goal") {
      return snapshot.savedOnGoal;
    }
    return snapshot.accounts?.find((account) => account.kind === kind)?.balance ?? 0;
  }, []);

  /** Отправить изменение на сервер и перечитать состояние. */
  const push = useCallback(
    async (action: () => Promise<unknown>) => {
      if (demoRef.current) {
        return;
      }
      try {
        await action();
      } catch (error) {
        const text = error instanceof Error ? error.message : "";
        showToastRef.current?.(text || "Сервер недоступен: изменение не сохранилось");
      }
      void hydrateRef.current();
    },
    [],
  );

  /** Отправить изменение и вернуть, получилось ли (для переводов важен результат). */
  const pushOrFail = useCallback(async (action: () => Promise<unknown>): Promise<boolean> => {
    if (demoRef.current) {
      return true;
    }
    let ok = true;
    try {
      await action();
    } catch (error) {
      ok = false;
      const text = error instanceof Error ? error.message : "";
      showToastRef.current?.(text || "Сервер недоступен: изменение не сохранилось");
    }
    void hydrateRef.current();
    return ok;
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => setToast(null), 2400);
  }, []);
  showToastRef.current = showToast;

  const pushNotification = useCallback(
    (n: { title: Localized; body: Localized; kind: AppNotification["kind"] }) => {
      setState((prev) => ({
        ...prev,
        notifications: [
          { id: nextId("n"), at: new Date().toISOString(), ...n },
          ...prev.notifications,
        ],
      }));
    },
    [],
  );

  const setRole = useCallback((role: Role | null) => {
    setState((prev) => ({
      ...prev,
      role,
      childSession: role === "child" ? true : prev.childSession,
    }));
  }, []);

  const applyBracket = useCallback((bracket: AgeBracket) => {
    setState((prev) => {
      const consents = buildConsents(bracket);
      return {
        ...prev,
        child: { ...prev.child, bracket },
        consents,
        permissions: buildPermissions(bracket, consents),
      };
    });
  }, []);

  const setChild = useCallback((patch: Partial<ChildProfile>) => {
    setState((prev) => ({ ...prev, child: { ...prev.child, ...patch } }));
  }, []);

  const toggleConsent = useCallback(
    (id: ConsentId) => {
      const childId = idsRef.current.childId;
      const signing = stateRef.current.consents.find((c) => c.id === id)?.signedAt == null;
      if (childId && signing) {
        void push(() => signConsentsApi(childId, [id]));
      }
      setState((prev) => {
      const consents = prev.consents.map((c) =>
        c.id === id ? { ...c, signedAt: c.signedAt ? null : new Date().toISOString() } : c,
      );
      return {
        ...prev,
        consents,
        permissions: prev.permissions.map((p) =>
          p.requiresConsent ? { ...p, hasConsent: consents.some((c) => c.id === "written14" && c.signedAt) } : p,
        ),
      };
    });
  }, [push]);

  const signAllConsents = useCallback(() => {
    const childId = idsRef.current.childId;
    if (childId) {
      const pending = stateRef.current.consents.filter((c) => !c.signedAt).map((c) => c.id);
      if (pending.length > 0) {
        void push(() => signConsentsApi(childId, pending));
      }
    }
    setState((prev) => {
      const consents = prev.consents.map((c) => ({
        ...c,
        signedAt: c.signedAt ?? new Date().toISOString(),
      }));
      return {
        ...prev,
        consents,
        permissions: prev.permissions.map((p) => (p.requiresConsent ? { ...p, hasConsent: true } : p)),
      };
    });
  }, [push]);

  /** Выпуск карты: сервер генерирует номер и срок, реквизиты приходят в снапшоте. */
  const issueCard = useCallback(
    async (type: CardType, system: CardSystem): Promise<boolean> => {
      const childId = idsRef.current.childId;
      if (!childId || demoRef.current) {
        setState((prev) => ({ ...prev, card: { ...prev.card, status: "active", type, system } }));
        return true;
      }
      const ok = await pushOrFail(() => issueCardApi(childId, type, system));
      if (ok) {
        void hydrate();
      }
      return ok;
    },
    [hydrate, pushOrFail],
  );

  const issueProducts = useCallback(() => {
    const childId = idsRef.current.childId;
    if (childId) {
      void push(() => issueCardApi(childId, "virtual", "visa"));
    } else if (!demoRef.current) {
      const profile = stateRef.current.child;
      void push(() => createChildApi({ name: profile.name, bracket: profile.bracket }));
    }
    setState((prev) => ({
      ...prev,
      onboarded: true,
      card: { ...prev.card, status: "active" },
    }));
    pushNotification({
      title: L("Продукты выпущены", "Прадукты выпушчаны"),
      body: L("Виртуальная карта активна, физическая — в доставке", "Віртуальная карта актыўная, фізічная — у дастаўцы"),
      kind: "ops",
    });
  }, [push, pushNotification]);

  const grantAccess = useCallback(() => {
    const childId = idsRef.current.childId;
    if (childId) {
      void push(() => setAccessApi(childId, true));
    }
    setState((prev) => ({ ...prev, accessGranted: true }));
    pushNotification({
      title: L("Доступ выдан", "Доступ выдадзены"),
      body: L("Ребёнок может войти в Moby Family", "Дзіця можа ўвайсці ў Moby Family"),
      kind: "access",
    });
  }, [push, pushNotification]);

  const revokeAccess = useCallback(() => {
    const childId = idsRef.current.childId;
    if (childId) {
      void push(() => setAccessApi(childId, false));
    }
    setState((prev) => ({ ...prev, accessGranted: false, childSession: false }));
    pushNotification({
      title: L("Доступ отозван", "Доступ адкліканы"),
      body: L("Сессия ребёнка закрыта", "Сесія дзіцяці закрыта"),
      kind: "access",
    });
  }, [push, pushNotification]);

  const togglePermission = useCallback((id: ProductId | OperationId) => {
    const childId = idsRef.current.childId;
    const current = stateRef.current.permissions.find((p) => p.id === id);
    if (childId && current) {
      const allowed = !current.allowed;
      void push(() =>
        current.kind === "product"
          ? patchPermissionApi(childId, id as ProductId, allowed)
          : patchOperationApi(childId, id as OperationId, allowed),
      );
    }
    setState((prev) => ({
      ...prev,
      permissions: prev.permissions.map((p) => (p.id === id ? { ...p, allowed: !p.allowed } : p)),
    }));
  }, [push]);

  /** Счёт открывает родитель; ребёнок может попросить, и родитель подтвердит запрос. */
  const openAccount = useCallback(
    async (kind: AccountKind): Promise<"opened" | "requested"> => {
      const childId = idsRef.current.childId;
      const role = stateRef.current.role;
      if (!childId || demoRef.current) {
        // Демо-режим: счёт появляется сразу, чтобы можно было показать переводы.
        setState((prev) => ({
          ...prev,
          accounts: [
            ...(prev.accounts ?? []).filter((account) => account.kind !== kind),
            { kind, balance: 0 },
          ],
          permissions: prev.permissions.map((permission) =>
            permission.id === kind ? { ...permission, allowed: true, pendingRequest: false } : permission,
          ),
        }));
        return "opened";
      }
      if (role === "parent") {
        const ok = await pushOrFail(() => openAccountApi(childId, kind));
        return ok ? "opened" : "opened";
      }
      let result: "opened" | "requested" = "requested";
      try {
        const answer = await openAccountApi(childId, kind);
        result = answer.status;
      } catch (error) {
        showToastRef.current?.(error instanceof Error ? error.message : "Сервер недоступен: попробуйте ещё раз");
      }
      void hydrateRef.current();
      return result;
    },
    [pushOrFail],
  );

  /** Перевод между своими счетами — деньги не покидают семью. */
  const moveMoney = useCallback(
    async (from: AccountKind | "goal", to: AccountKind | "goal", amount: number): Promise<boolean> => {
      if (amount <= 0) {
        return false;
      }
      const snapshot = stateRef.current;
      if (balanceOf(snapshot, from) + 0.001 < amount) {
        showToastRef.current?.("Недостаточно денег на этом счёте");
        return false;
      }
      const childId = idsRef.current.childId;
      if (childId && !demoRef.current) {
        return pushOrFail(() => transferApi(childId, from, to, amount));
      }
      // Демо-режим: переносим локально, чтобы экран жил без сервера.
      setState((prev) => {
        const delta = (kind: AccountKind | "goal") => (kind === from ? -amount : kind === to ? amount : 0);
        return {
          ...prev,
          balance: Math.max(0, prev.balance + delta("pocket")),
          savedOnGoal: Math.max(0, prev.savedOnGoal + delta("goal")),
          goal: { ...prev.goal, saved: Math.max(0, prev.goal.saved + delta("goal")) },
          accounts: (prev.accounts ?? []).map((account) => ({
            ...account,
            balance: Math.max(0, account.balance + delta(account.kind)),
          })),
          transfers: [
            { id: `t${Date.now()}`, from, to, amount, at: new Date().toISOString() },
            ...(prev.transfers ?? []),
          ],
        };
      });
      return true;
    },
    [balanceOf, pushOrFail],
  );

  const updateLimits = useCallback(
    (patch: Partial<LimitState>) => {
      const childId = idsRef.current.childId;
      if (childId) {
        void push(() => patchLimitsApi(childId, patch));
      }
      setState((prev) => ({ ...prev, limits: { ...prev.limits, ...patch } }));
    },
    [push],
  );

  const toggleCardBlock = useCallback(() => {
    const childId = idsRef.current.childId;
    if (childId) {
      void push(() => patchCardApi(childId, stateRef.current.card.status !== "blocked"));
    }
    setState((prev) => ({
      ...prev,
      card: { ...prev.card, status: prev.card.status === "blocked" ? "active" : "blocked" },
    }));
  }, [push]);

  const completeQuest = useCallback((id: string) => {
    const childId = idsRef.current.childId;
    if (childId) {
      void push(() => completeQuestApi(childId, id));
    }
    setState((prev) => ({
      ...prev,
      quests: prev.quests.map((q) =>
        q.id === id ? { ...q, status: q.from === "parent" ? "waiting" : "approved" } : q,
      ),
      points: prev.quests.find((q) => q.id === id)?.from === "moby"
        ? prev.points + (prev.quests.find((q) => q.id === id)?.points ?? 0)
        : prev.points,
    }));
  }, [push]);

  const approveQuest = useCallback(
    (id: string) => {
      const childId = idsRef.current.childId;
      if (childId) {
        void push(() => approveQuestApi(childId, id));
      }
      setState((prev) => {
        const quest = prev.quests.find((q) => q.id === id);
        if (!quest) {
          return prev;
        }
        return {
          ...prev,
          quests: prev.quests.map((q) => (q.id === id ? { ...q, status: "approved" } : q)),
          points: prev.points + quest.points,
          balance: prev.balance + quest.amount,
        };
      });
      pushNotification({
        title: L("Награда зачислена", "Узнагарода залічана"),
        body: L("Задание выполнено и подтверждено", "Заданне выканана і пацверджана"),
        kind: "reward",
      });
    },
    [push, pushNotification],
  );

  const addToGoal = useCallback((amount: number) => {
    const childId = idsRef.current.childId;
    const goalId = idsRef.current.goalId;
    if (childId && goalId) {
      void push(() => depositGoalApi(childId, goalId, amount));
    }
    setState((prev) => ({
      ...prev,
      balance: Math.max(0, prev.balance - amount),
      savedOnGoal: prev.savedOnGoal + amount,
      goal: { ...prev.goal, saved: prev.goal.saved + amount },
    }));
  }, [push]);

  const requestAccess = useCallback(
    (target: ProductId | "limit", label: Localized) => {
      const childId = idsRef.current.childId;
      if (childId) {
        void push(() => createRequestApi(childId, target, label));
      }
      setState((prev) => ({
        ...prev,
        requests: [
          { id: nextId("r"), label, target, status: "pending", at: new Date().toISOString() },
          ...prev.requests,
        ],
        permissions: prev.permissions.map((p) =>
          p.id === target ? { ...p, pendingRequest: true } : p,
        ),
      }));
      pushNotification({
        title: L("Новый запрос от ребёнка", "Новы запыт ад дзіцяці"),
        body: label,
        kind: "request",
      });
    },
    [push, pushNotification],
  );

  const resolveRequest = useCallback(
    (id: string, approve: boolean) => {
      const childId = idsRef.current.childId;
      if (childId) {
        void push(() => resolveRequestApi(childId, id, approve));
      }
      setState((prev) => {
        const request = prev.requests.find((r) => r.id === id) as AccessRequest | undefined;
        if (!request) {
          return prev;
        }
        return {
          ...prev,
          requests: prev.requests.map((r) =>
            r.id === id ? { ...r, status: approve ? "approved" : "declined" } : r,
          ),
          permissions: prev.permissions.map((p) =>
            p.id === request.target
              ? { ...p, allowed: approve ? true : p.allowed, pendingRequest: false }
              : p,
          ),
          limits:
            request.target === "limit" && approve
              ? { ...prev.limits, monthly: prev.limits.monthly + 20 }
              : prev.limits,
        };
      });
    },
    [push],
  );

  const reset = useCallback(() => {
    setState(initialState);
    showToast("Demo reset");
  }, [showToast]);

  /** Пополнение счёта ребёнка родителем — главное действие в обзоре. */
  const topUpChild = useCallback(
    async (amount: number): Promise<boolean> => {
      if (amount <= 0) {
        return false;
      }
      const childId = idsRef.current.childId;
      if (childId && !demoRef.current) {
        const ok = await pushOrFail(() => topUpApi(childId, amount));
        if (ok) {
          void hydrate();
        }
        return ok;
      }
      setState((prev) => ({
        ...prev,
        balance: prev.balance + amount,
        accounts: (prev.accounts ?? []).map((account) =>
          account.kind === "pocket" ? { ...account, balance: account.balance + amount } : account,
        ),
      }));
      return true;
    },
    [hydrate, pushOrFail],
  );

  const value = useMemo<StoreValue>(
    () => ({
      state,
      toast,
      showToast,
      setRole,
      setChild,
      setBracket: applyBracket,
      toggleConsent,
      signAllConsents,
      issueProducts,
      issueCard,
      grantAccess,
      revokeAccess,
      togglePermission,
      updateLimits,
      openAccount,
      moveMoney,
      topUpChild,
      toggleCardBlock,
      completeQuest,
      approveQuest,
      addToGoal,
      requestAccess,
      resolveRequest,
      pushNotification,
      reset,
    }),
    [
      state,
      toast,
      showToast,
      setRole,
      setChild,
      applyBracket,
      toggleConsent,
      signAllConsents,
      issueProducts,
      issueCard,
      grantAccess,
      revokeAccess,
      togglePermission,
      updateLimits,
      openAccount,
      moveMoney,
      topUpChild,
      toggleCardBlock,
      completeQuest,
      approveQuest,
      addToGoal,
      requestAccess,
      resolveRequest,
      pushNotification,
      reset,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error("useStore must be used inside StoreProvider");
  }
  return ctx;
}
