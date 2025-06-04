import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

export function registerChartModules() {
  ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
}
