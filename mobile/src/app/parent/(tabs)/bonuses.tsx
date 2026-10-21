import { TasksFromParent } from "@/ui/TasksFromParent";
import React from "react";

import { useI18n } from "@/i18n";
import { BonusesView } from "@/ui/BonusesView";
import { Screen } from "@/ui/Screen";

export default function ParentBonusesScreen() {
  const { t } = useI18n();
  return (
    <Screen title={t("bc.title")} subtitle={t("bc.subtitle")}>
      <TasksFromParent mode="parent" />
<BonusesView audience="parent" />
    </Screen>
  );
}
