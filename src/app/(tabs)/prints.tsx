import { EmptyState, Screen } from '../../components/ui';

export default function PrintsScreen() {
  return (
    <Screen>
      <EmptyState
        title="Todavía no hay impresiones"
        message="Aquí verás cada impresión con su coste. Lo construimos en el siguiente paso."
      />
    </Screen>
  );
}
