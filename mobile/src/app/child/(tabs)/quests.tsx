import { TasksFromParent } from "@/ui/TasksFromParent";
import React from "react";

import { useI18n } from "@/i18n";
import { BonusesView } from "@/ui/BonusesView";
import { Screen } from "@/ui/Screen";

export default function ChildQuestsScreen() {
  const { t } = useI18n();
  return (
    <Screen title={t("qs.title")} subtitle={t("qs.subtitle")}>
      <TasksFromParent mode="child" />
<BonusesView audience="child" />
    </Screen>
  );
}
