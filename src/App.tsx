import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  CircleHelp,
  CircleCheck,
  Clock3,
  LayoutDashboard,
  Leaf,
  Menu,
  Package,
  RefreshCw,
  Search,
  Scissors,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDashboard } from "./hooks/useDashboard";
import {
  exportCSV,
  formatMoney,
  formatNumber,
  getDateRange,
  getFilteredSales,
  getSummary,
} from "./lib/analytics";
import type { Channel, Filters, Product } from "./lib/types";

type View = "overview" | "sales" | "profit" | "products" | "production";
const navigation = [
  { id: "overview" as View, label: "Resumen general", icon: LayoutDashboard },
  { id: "sales" as View, label: "Ventas", icon: ShoppingBag },
  { id: "profit" as View, label: "Rentabilidad", icon: ChartNoAxesCombined },
  { id: "products" as View, label: "Productos y stock", icon: Package },
  { id: "production" as View, label: "Producción", icon: Scissors },
];
const titles: Record<
  View,
  { eyebrow: string; title: string; description: string }
> = {
  overview: {
    eyebrow: "UNA MIRADA COMPLETA",
    title: "Tu negocio, en perspectiva.",
    description: "Entendé qué está pasando hoy. Decidí lo que viene.",
  },
  sales: {
    eyebrow: "DE LA VENTA A LA OPORTUNIDAD",
    title: "Cada venta cuenta una historia.",
    description: "Descubrí qué productos y canales impulsan tu marca.",
  },
  profit: {
    eyebrow: "NÚMEROS QUE CIERRAN",
    title: "Crecer también es ganar mejor.",
    description: "Una vista clara de tus ingresos, costos y resultados.",
  },
  products: {
    eyebrow: "EL EQUILIBRIO DE TU COLECCIÓN",
    title: "El producto correcto. A tiempo.",
    description: "Conectá el rendimiento de tu colección con tu inventario.",
  },
  production: {
    eyebrow: "DE LA IDEA A LA ENTREGA",
    title: "Tu próxima colección, en marcha.",
    description: "Seguí cada orden y anticipá el próximo paso.",
  },
};
const palette = ["#294b3d", "#95a882", "#e1ceb1", "#bfcca8", "#879d94"];
const pct = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(Number.isFinite(value) ? value : 0);
const shortDate = (date: string) =>
  new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date.slice(0, 10)}T12:00:00Z`));

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`}>
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>
        trama<span className="brand-period">.</span>
      </span>
    </div>
  );
}

function StatCard({
  label,
  value,
  change,
  detail,
  icon,
  accent = false,
}: {
  label: string;
  value: string;
  change?: number;
  detail: string;
  icon: ReactNode;
  accent?: boolean;
}) {
  return (
    <article className={`stat-card ${accent ? "stat-accent" : ""}`}>
      <div className="stat-heading">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <strong className="stat-value">{value}</strong>
      <div className="stat-foot">
        {change !== undefined && (
          <span className={`change ${change < 0 ? "negative" : ""}`}>
            {change < 0 ? (
              <ArrowDownLeft size={12} />
            ) : (
              <ArrowUpRight size={12} />
            )}
            {pct(Math.abs(change))}
          </span>
        )}
        <span>{detail}</span>
      </div>
    </article>
  );
}

function Panel({
  title,
  subtitle,
  action,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: readonly {
    name?: string;
    value?: number | string;
    color?: string;
  }[];
  label?: ReactNode;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item, i) => (
        <div key={i}>
          <span
            className="legend-dot"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.name}</span>
          <b>{formatMoney(Number(item.value))}</b>
        </div>
      ))}
    </div>
  );
}

function RevenueChart({
  monthly,
  mode,
  setMode,
}: {
  monthly: ReturnType<typeof getSummary>["monthly"];
  mode: "revenue" | "profit";
  setMode: (mode: "revenue" | "profit") => void;
}) {
  return (
    <Panel
      title="El pulso de tu negocio"
      subtitle="Evolución mensual · en pesos argentinos"
      action={
        <div className="segmented" aria-label="Métrica del gráfico">
          <button
            type="button"
            className={mode === "revenue" ? "selected" : ""}
            onClick={() => setMode("revenue")}
            aria-pressed={mode === "revenue"}
          >
            Ingresos
          </button>
          <button
            type="button"
            className={mode === "profit" ? "selected" : ""}
            onClick={() => setMode("profit")}
            aria-pressed={mode === "profit"}
          >
            Resultado
          </button>
        </div>
      }
      className="trend-panel"
    >
      <div className="chart-legend">
        <span>
          <i style={{ background: "#7f9871" }} />
          {mode === "revenue" ? "Ingresos por ventas" : "Resultado operativo"}
        </span>
        <span>
          <i style={{ background: "#d9d2c4" }} />
          Gastos operativos
        </span>
      </div>
      <div
        className="trend-chart"
        role="img"
        aria-label="Gráfico de evolución mensual de ingresos o resultado y gastos operativos"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={monthly}
            margin={{ top: 15, right: 10, bottom: 2, left: 4 }}
          >
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#91a77d" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#91a77d" stopOpacity={0.015} />
              </linearGradient>
              <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d4ccbc" stopOpacity={0.23} />
                <stop offset="100%" stopColor="#d4ccbc" stopOpacity={0.015} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="#eef0e9"
              strokeDasharray="4 4"
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#8b9389", fontSize: 11 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#8b9389", fontSize: 10 }}
              tickFormatter={(value) => formatMoney(value, true)}
              width={66}
              tickCount={5}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="expenses"
              name="Gastos operativos"
              stroke="#c7bda9"
              fill="url(#expenseFill)"
              strokeWidth={1.5}
              dot={monthly.length === 1 ? { r: 4, fill: "#c7bda9" } : false}
              activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey={mode}
              name={mode === "revenue" ? "Ingresos" : "Resultado operativo"}
              stroke="#74915e"
              strokeWidth={2.5}
              fill="url(#revenueFill)"
              dot={monthly.length === 1 ? { r: 5, fill: "#74915e" } : false}
              activeDot={{ r: 5, stroke: "#fff", strokeWidth: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

function ChannelPanel({
  channels,
}: {
  channels: ReturnType<typeof getSummary>["channels"];
}) {
  const total = channels.reduce((sum, channel) => sum + channel.value, 0);
  return (
    <Panel
      title="Dónde eligen tu marca"
      subtitle="Participación por canal"
      className="channel-panel"
    >
      <div className="donut-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={channels}
              dataKey="value"
              nameKey="name"
              innerRadius={65}
              outerRadius={84}
              paddingAngle={4}
              cornerRadius={3}
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {channels.map((channel, i) => (
                <Cell key={channel.name} fill={palette[i % palette.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatMoney(Number(value))}
              contentStyle={{
                borderRadius: 10,
                border: "1px solid #e6e9e1",
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <span>VENTAS TOTALES</span>
          <strong>{formatMoney(total, true)}</strong>
          <small>en el período</small>
        </div>
      </div>
      <div className="channel-list">
        {channels.map((channel, i) => (
          <div key={channel.name}>
            <span>
              <i style={{ background: palette[i % palette.length] }} />
              {channel.name}
            </span>
            <strong>{pct(total > 0 ? channel.value / total : 0)}</strong>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ProductMark({ product }: { product: Product }) {
  return (
    <span
      className="product-mark"
      style={{ backgroundColor: `${product.color}25`, color: product.color }}
    >
      <ShoppingBag size={19} strokeWidth={1.4} />
    </span>
  );
}

function TopProducts({
  products,
  onViewAll,
}: {
  products: ReturnType<typeof getSummary>["topProducts"];
  onViewAll: () => void;
}) {
  return (
    <Panel
      title="Los favoritos de tu colección"
      subtitle="Los 5 productos con más ingresos"
      action={
        <button className="text-button" onClick={onViewAll}>
          Ver productos <ArrowRight size={14} />
        </button>
      }
      className="products-panel"
    >
      <div className="table-scroll">
        <table className="data-table favorites-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Unidades</th>
              <th>Ingresos</th>
              <th>Margen bruto</th>
            </tr>
          </thead>
          <tbody>
            {products.slice(0, 5).map((product) => (
              <tr key={product.id}>
                <td>
                  <div className="product-cell">
                    <ProductMark product={product} />
                    <div>
                      <strong>{product.name}</strong>
                      <small>{product.category}</small>
                    </div>
                  </div>
                </td>
                <td>{formatNumber(product.units)}</td>
                <td className="number-strong">
                  {formatMoney(product.revenue)}
                </td>
                <td>
                  <span className="margin-pill">{pct(product.margin)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <p className="empty-state">No hay ventas para estos filtros.</p>
        )}
      </div>
    </Panel>
  );
}

export default function App() {
  const { dataset, source, loading, error, refresh } = useDashboard();
  const [view, setView] = useState<View>("overview");
  const [filters, setFilters] = useState<Filters>({
    period: "year",
    channel: "Todos los canales",
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia("(max-width: 790px)").matches,
  );
  const [chartMode, setChartMode] = useState<"revenue" | "profit">("revenue");
  const [productSearch, setProductSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [saleSearch, setSaleSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [exported, setExported] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const exportTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (exportTimer.current) clearTimeout(exportTimer.current);
    },
    [],
  );
  useEffect(() => {
    const media = window.matchMedia("(max-width: 790px)");
    const update = () => {
      setIsMobile(media.matches);
      if (!media.matches) setMenuOpen(false);
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const sidebar = sidebarRef.current;
    const focusable = sidebar?.querySelectorAll<HTMLButtonElement>("button");
    focusable?.[0]?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !dialogRef.current?.open) {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
      if (event.key === "Tab" && focusable?.length) {
        const first = focusable[0],
          last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);
  const summary = useMemo(
    () => (dataset ? getSummary(dataset, filters) : null),
    [dataset, filters],
  );
  const filteredSales = useMemo(
    () => (dataset ? getFilteredSales(dataset, filters) : []),
    [dataset, filters],
  );
  const products = useMemo(() => {
    if (!dataset || !summary) return [];
    return dataset.products
      .map((product) => ({
        ...product,
        units: 0,
        revenue: 0,
        margin: 0,
        ...summary.topProducts.find((p) => p.id === product.id),
      }))
      .filter(
        (product) =>
          `${product.name} ${product.sku} ${product.category}`
            .toLocaleLowerCase("es")
            .includes(productSearch.toLocaleLowerCase("es")) &&
          (stockFilter !== "low" || product.stock <= product.minStock),
      )
      .sort((a, b) => b.revenue - a.revenue);
  }, [dataset, summary, productSearch, stockFilter]);
  const salesTable = useMemo(
    () =>
      filteredSales
        .filter((sale) => {
          const product = dataset?.products.find(
            (item) => item.id === sale.productId,
          );
          return `${product?.name} ${sale.id} ${sale.channel}`
            .toLocaleLowerCase("es")
            .includes(saleSearch.toLocaleLowerCase("es"));
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [filteredSales, dataset, saleSearch],
  );
  const production = useMemo(
    () =>
      dataset?.production
        .filter(
          (order) => statusFilter === "all" || order.status === statusFilter,
        )
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)) ?? [],
    [dataset, statusFilter],
  );
  const navigate = (target: View) => {
    setView(target);
    setMenuOpen(false);
    if (isMobile) menuButtonRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const download = () => {
    if (!dataset) return;
    const blob = new Blob([exportCSV(dataset, filters)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `trama-ventas-${filters.period}-${filters.channel.replaceAll(" ", "-").toLowerCase()}.csv`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExported(true);
    if (exportTimer.current) clearTimeout(exportTimer.current);
    exportTimer.current = setTimeout(() => setExported(false), 2500);
  };
  const showAbout = () => dialogRef.current?.showModal();
  const heading = titles[view];
  if (!dataset || !summary)
    return (
      <div className="initial-loading">
        <Brand />
        <span>Preparando una nueva perspectiva…</span>
      </div>
    );
  const range = getDateRange(dataset, filters.period);
  const asOf = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(dataset.updatedAt));
  const monthLabel = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(dataset.updatedAt));
  const yearLabel = new Date(dataset.updatedAt).getUTCFullYear();
  const openOrders = dataset.production.filter(
    (order) => order.status !== "Listo",
  );
  const piecesInProduction = openOrders.reduce(
    (sum, order) => sum + order.units,
    0,
  );

  return (
    <div className="app-shell">
      {menuOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        id="main-navigation"
        className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}
        aria-label="Navegación principal"
        inert={isMobile && !menuOpen}
      >
        <div className="sidebar-brand">
          <Brand />
          <p>El hilo que une tu negocio.</p>
        </div>
        <div className="workspace-card">
          <span className="workspace-avatar">
            L<span>·</span>
          </span>
          <div>
            <strong>{dataset.company}</strong>
            <small>Marca de ejemplo</small>
          </div>
          <span className="workspace-dot" />
        </div>
        <span className="nav-label">TU NEGOCIO</span>
        <nav>
          {navigation.map((item) => (
            <button
              type="button"
              className={`nav-item ${view === item.id ? "active" : ""}`}
              key={item.id}
              onClick={() => navigate(item.id)}
              aria-current={view === item.id ? "page" : undefined}
            >
              <item.icon size={18} strokeWidth={1.65} />
              <span>{item.label}</span>
              {view === item.id && <span className="active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-message">
            <span className="sidebar-message-icon">
              <Sparkles size={18} />
            </span>
            <h3>
              Tu marca tiene
              <br />
              mucho para contar.
            </h3>
            <p>
              Nosotros te ayudamos
              <br />a leer sus números.
            </p>
            <button onClick={showAbout}>
              Conocé esta demo <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="sidebar-footer">
            <Leaf size={14} strokeWidth={1.6} />
            <span>Hecho para crecer con vos.</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              ref={menuButtonRef}
              className="icon-button mobile-menu"
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuOpen}
              aria-controls="main-navigation"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb">
              Workspace <span>/</span> <strong>{dataset.company}</strong>
            </span>
          </div>
          <div className="topbar-right">
            <span className="demo-badge">
              <i />
              Demo · datos ficticios
            </span>
            <button
              className="help-button"
              onClick={showAbout}
              aria-label="Sobre esta demo"
            >
              <CircleHelp size={18} />
            </button>
            <span className="user-avatar" aria-label="Marca de ejemplo">
              LS
            </span>
          </div>
        </header>
        <div className="page-content">
          <section className="page-heading">
            <div>
              <span className="eyebrow">{heading.eyebrow}</span>
              <h1>{heading.title}</h1>
              <p>{heading.description}</p>
            </div>
            <div className="heading-flourish" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </section>
          <div className="toolbar">
            <div className="filter-group">
              {view !== "production" ? (
                <>
                  <label className="filter-control">
                    <span className="sr-only">Período</span>
                    <Clock3 size={15} />
                    <select
                      value={filters.period}
                      onChange={(event) =>
                        setFilters((f) => ({
                          ...f,
                          period: event.target.value as Filters["period"],
                        }))
                      }
                    >
                      <option value="month">
                        {monthLabel[0].toUpperCase() + monthLabel.slice(1)}
                      </option>
                      <option value="quarter">Últimos 3 meses</option>
                      <option value="year">Año acumulado · {yearLabel}</option>
                    </select>
                    <ChevronDown size={13} />
                  </label>
                  <label className="filter-control channel-filter">
                    <span className="sr-only">Canal de venta</span>
                    <SlidersHorizontal size={15} />
                    <select
                      value={filters.channel}
                      onChange={(event) =>
                        setFilters((f) => ({
                          ...f,
                          channel: event.target.value as Filters["channel"],
                        }))
                      }
                    >
                      <option>Todos los canales</option>
                      {(
                        ["Tienda online", "Showroom", "Mayorista"] as Channel[]
                      ).map((channel) => (
                        <option key={channel}>{channel}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} />
                  </label>
                </>
              ) : (
                <span className="production-date">
                  <Clock3 size={15} />
                  Estado de la producción al {asOf}
                </span>
              )}
            </div>
            <div className="toolbar-actions">
              <button
                className={`icon-button refresh-button ${loading ? "is-refreshing" : ""}`}
                onClick={refresh}
                disabled={loading}
                aria-label="Actualizar datos"
                title="Actualizar datos"
              >
                <RefreshCw size={16} />
              </button>
              {view !== "production" && (
                <button className="export-button" onClick={download}>
                  {exported ? (
                    <Check size={15} />
                  ) : (
                    <ArrowDownToLine size={15} />
                  )}
                  <span>{exported ? "Exportado" : "Exportar ventas"}</span>
                </button>
              )}
            </div>
          </div>
          {error && (
            <div className="notice" role="status">
              <CircleHelp size={15} />
              <span>
                Mostramos la copia de demostración mientras se restablece la
                actualización.
              </span>
              <button onClick={refresh} disabled={loading}>
                Reintentar
              </button>
            </div>
          )}

          {view !== "production" && (
            <div className="stats-grid">
              <StatCard
                label="Ingresos por ventas"
                value={formatMoney(summary.revenue, isMobile)}
                change={summary.revenueChange}
                detail="vs. período anterior"
                icon={<TrendingUp size={18} />}
              />
              <StatCard
                label="Margen bruto"
                value={pct(summary.grossMargin)}
                detail={`${formatMoney(summary.grossProfit, true)} después del costo de producto`}
                icon={<ChartNoAxesCombined size={18} />}
              />
              <StatCard
                label="Unidades vendidas"
                value={formatNumber(summary.units)}
                change={summary.unitsChange}
                detail="vs. período anterior"
                icon={<ShoppingBag size={18} />}
              />
              <StatCard
                label="Resultado operativo"
                value={formatMoney(summary.operatingProfit, isMobile)}
                detail={`${pct(summary.operatingMargin)} de tus ingresos`}
                icon={<ArrowUpRight size={18} />}
                accent
              />
            </div>
          )}

          {view === "overview" && (
            <>
              <div className="chart-grid">
                <RevenueChart
                  monthly={summary.monthly}
                  mode={chartMode}
                  setMode={setChartMode}
                />
                <ChannelPanel channels={summary.channels} />
              </div>
              <div className="lower-grid">
                <TopProducts
                  products={summary.topProducts}
                  onViewAll={() => navigate("products")}
                />
                <section className="insight-card">
                  <div className="insight-heading">
                    <span>
                      <Sparkles size={15} /> UNA OPORTUNIDAD
                    </span>
                    <ArrowUpRight size={20} />
                  </div>
                  <h2>
                    Los números también
                    <br />
                    te marcan el camino.
                  </h2>
                  {summary.topProducts[0] ? (
                    <p>
                      <strong>{summary.topProducts[0].name}</strong> lidera tu
                      colección con {formatNumber(summary.topProducts[0].units)}{" "}
                      unidades vendidas en este período.
                    </p>
                  ) : (
                    <p>
                      Explorá los canales para encontrar las oportunidades de tu
                      próxima colección.
                    </p>
                  )}
                  <div className="insight-divider" />
                  <div className="stock-insight">
                    <span className="stock-insight-icon">
                      <Package size={19} />
                    </span>
                    <div>
                      <strong>
                        {summary.lowStock.length} productos para revisar
                      </strong>
                      <p>Con stock en el mínimo o por debajo.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setStockFilter("low");
                      navigate("products");
                    }}
                  >
                    Mirar mi inventario <ArrowRight size={15} />
                  </button>
                </section>
              </div>
            </>
          )}

          {view === "sales" && (
            <>
              <div className="chart-grid">
                <RevenueChart
                  monthly={summary.monthly}
                  mode={chartMode}
                  setMode={setChartMode}
                />
                <ChannelPanel channels={summary.channels} />
              </div>
              <Panel
                title="El detalle detrás de tus ventas"
                subtitle={`${formatNumber(salesTable.length)} registros · ${range.label}`}
                action={
                  <label className="search-control">
                    <Search size={15} />
                    <input
                      aria-label="Buscar ventas"
                      placeholder="Producto, canal o referencia"
                      value={saleSearch}
                      onChange={(event) => setSaleSearch(event.target.value)}
                    />
                  </label>
                }
              >
                <div className="table-scroll sales-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Producto</th>
                        <th>Canal</th>
                        <th>Unidades</th>
                        <th>Venta neta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesTable.slice(0, 100).map((sale) => (
                        <tr key={sale.id}>
                          <td className="muted-cell">{shortDate(sale.date)}</td>
                          <td>
                            <strong>
                              {dataset.products.find(
                                (p) => p.id === sale.productId,
                              )?.name ?? "Producto"}
                            </strong>
                            <small className="reference">{sale.id}</small>
                          </td>
                          <td>
                            <span className="channel-tag">{sale.channel}</span>
                          </td>
                          <td>{formatNumber(sale.units)}</td>
                          <td className="number-strong">
                            {formatMoney(
                              sale.units * sale.unitPrice * (1 - sale.discount),
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {salesTable.length === 0 && (
                    <p className="empty-state">
                      No encontramos ventas con esa búsqueda.
                    </p>
                  )}
                </div>
                {salesTable.length > 100 && (
                  <p className="table-note">
                    Mostrando los últimos 100 de{" "}
                    {formatNumber(salesTable.length)} registros. Exportá las
                    ventas para ver el detalle completo.
                  </p>
                )}
              </Panel>
            </>
          )}

          {view === "profit" && (
            <>
              <div className="profit-grid">
                <Panel
                  title="Tu estado de resultados"
                  subtitle={`${range.label} · pesos argentinos`}
                  className="pnl-panel"
                >
                  <div className="pnl-list">
                    <div>
                      <span>Ingresos netos por ventas</span>
                      <strong>{formatMoney(summary.revenue)}</strong>
                    </div>
                    <div className="pnl-deduction">
                      <span>
                        <span className="pnl-minus">−</span> Costo de los
                        productos vendidos
                      </span>
                      <span>
                        {formatMoney(summary.revenue - summary.grossProfit)}
                      </span>
                    </div>
                    <div className="pnl-subtotal">
                      <span>
                        Resultado bruto{" "}
                        <small>{pct(summary.grossMargin)} de margen</small>
                      </span>
                      <strong>{formatMoney(summary.grossProfit)}</strong>
                    </div>
                    <div className="pnl-expenses">
                      <h3>GASTOS OPERATIVOS</h3>
                      {summary.expenseCategories.map((category) => (
                        <div key={category.name}>
                          <span>{category.name}</span>
                          <span>{formatMoney(category.value)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pnl-deduction">
                      <span>Total de gastos</span>
                      <strong>{formatMoney(summary.expenses)}</strong>
                    </div>
                    <div className="pnl-total">
                      <span>
                        Resultado operativo
                        <small>Antes de impuestos e intereses</small>
                      </span>
                      <strong>{formatMoney(summary.operatingProfit)}</strong>
                    </div>
                  </div>
                  {filters.channel !== "Todos los canales" && (
                    <p className="table-note">
                      Los gastos se asignan según la participación del canal en
                      los ingresos del período.
                    </p>
                  )}
                </Panel>
                <Panel
                  title="En qué se invierte"
                  subtitle="Distribución de gastos operativos"
                  className="expense-panel"
                >
                  <div className="expense-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={summary.expenseCategories}
                        layout="vertical"
                        margin={{ top: 5, right: 20, left: 0, bottom: 10 }}
                      >
                        <CartesianGrid horizontal={false} stroke="#eef0e9" />
                        <XAxis
                          type="number"
                          tickFormatter={(value) => formatMoney(value, true)}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#879182", fontSize: 10 }}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={115}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#647060", fontSize: 11 }}
                        />
                        <Tooltip
                          formatter={(value) => formatMoney(Number(value))}
                          contentStyle={{
                            borderRadius: 10,
                            border: "1px solid #e6e9e1",
                            fontSize: 12,
                          }}
                        />
                        <Bar
                          dataKey="value"
                          name="Gastos"
                          fill="#91a481"
                          radius={[0, 4, 4, 0]}
                          barSize={24}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="profit-explainer">
                    <span>
                      <Leaf size={18} />
                    </span>
                    <p>
                      La rentabilidad se construye mirando las ventas{" "}
                      <strong>y</strong> todo lo que hace falta para lograrlas.
                    </p>
                  </div>
                </Panel>
              </div>
            </>
          )}

          {view === "products" && (
            <Panel
              title="Tu colección, producto por producto"
              subtitle="Ventas del período seleccionado · inventario al día de la demo"
              action={
                <div className="table-controls">
                  <label className="search-control">
                    <Search size={15} />
                    <input
                      placeholder="Buscar producto o SKU"
                      aria-label="Buscar producto o SKU"
                      value={productSearch}
                      onChange={(event) => setProductSearch(event.target.value)}
                    />
                  </label>
                  <label className="stock-select">
                    <span className="sr-only">Filtrar inventario</span>
                    <select
                      value={stockFilter}
                      onChange={(event) => setStockFilter(event.target.value)}
                    >
                      <option value="all">Todo el stock</option>
                      <option value="low">Stock a revisar</option>
                    </select>
                    <ChevronDown size={13} />
                  </label>
                </div>
              }
            >
              <div className="table-scroll">
                <table className="data-table inventory-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Precio de lista</th>
                      <th>Vendidos</th>
                      <th>Ingresos</th>
                      <th>Stock actual</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <div className="product-cell">
                            <ProductMark product={product} />
                            <div>
                              <strong>{product.name}</strong>
                              <small>
                                {product.sku} · {product.category}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>{formatMoney(product.price)}</td>
                        <td>{formatNumber(product.units)}</td>
                        <td className="number-strong">
                          {formatMoney(product.revenue)}
                        </td>
                        <td>
                          <strong>{formatNumber(product.stock)}</strong>
                          <small className="reference">
                            Mínimo {formatNumber(product.minStock)}
                          </small>
                        </td>
                        <td>
                          <span
                            className={`status-pill ${product.stock <= product.minStock ? "status-warning" : "status-ok"}`}
                          >
                            <i />
                            {product.stock <= product.minStock
                              ? "Revisar stock"
                              : "Disponible"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {products.length === 0 && (
                  <div className="empty-state">
                    <Package size={28} />
                    <strong>No hay productos para esta búsqueda.</strong>
                    <button
                      className="text-button"
                      onClick={() => {
                        setProductSearch("");
                        setStockFilter("all");
                      }}
                    >
                      Limpiar filtros
                    </button>
                  </div>
                )}
              </div>
            </Panel>
          )}

          {view === "production" && (
            <>
              <div className="production-stats">
                <StatCard
                  label="Órdenes en proceso"
                  value={formatNumber(openOrders.length)}
                  detail="En corte, confección o calidad"
                  icon={<Scissors size={18} />}
                />
                <StatCard
                  label="Unidades en producción"
                  value={formatNumber(piecesInProduction)}
                  detail="Próximas prendas de tu colección"
                  icon={<Package size={18} />}
                />
                <StatCard
                  label="Órdenes listas"
                  value={formatNumber(
                    dataset.production.filter(
                      (order) => order.status === "Listo",
                    ).length,
                  )}
                  detail="Con su proceso terminado"
                  icon={<CircleCheck size={18} />}
                  accent
                />
              </div>
              <div className="production-flow">
                {(
                  [
                    "En corte",
                    "En confección",
                    "Control de calidad",
                    "Listo",
                  ] as const
                ).map((status, i) => (
                  <button
                    className={statusFilter === status ? "flow-active" : ""}
                    key={status}
                    onClick={() =>
                      setStatusFilter(statusFilter === status ? "all" : status)
                    }
                    aria-pressed={statusFilter === status}
                  >
                    <span className="flow-step">0{i + 1}</span>
                    <span>
                      <strong>{status}</strong>
                      <small>
                        {
                          dataset.production.filter(
                            (order) => order.status === status,
                          ).length
                        }{" "}
                        órdenes
                      </small>
                    </span>
                    <ArrowRight size={16} />
                  </button>
                ))}
              </div>
              <Panel
                title="Lo que está tomando forma"
                subtitle="Órdenes de producción · ordenadas por fecha de entrega"
                action={
                  <label className="stock-select">
                    <span className="sr-only">Filtrar órdenes por estado</span>
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                    >
                      <option value="all">Todos los estados</option>
                      {[
                        "En corte",
                        "En confección",
                        "Control de calidad",
                        "Listo",
                      ].map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} />
                  </label>
                }
              >
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Orden / Producto</th>
                        <th>Taller</th>
                        <th>Unidades</th>
                        <th>Entrega prevista</th>
                        <th>Etapa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {production.map((order) => {
                        const product = dataset.products.find(
                          (p) => p.id === order.productId,
                        );
                        return (
                          <tr key={order.id}>
                            <td>
                              <div className="product-cell">
                                {product && <ProductMark product={product} />}
                                <div>
                                  <strong>{product?.name}</strong>
                                  <small>{order.id}</small>
                                </div>
                              </div>
                            </td>
                            <td>{order.workshop}</td>
                            <td>{formatNumber(order.units)}</td>
                            <td>{shortDate(order.dueDate)}</td>
                            <td>
                              <span
                                className={`status-pill ${order.status === "Listo" ? "status-ok" : order.status === "Control de calidad" ? "status-warning" : "status-neutral"}`}
                              >
                                <i />
                                {order.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {production.length === 0 && (
                    <p className="empty-state">No hay órdenes en esta etapa.</p>
                  )}
                </div>
              </Panel>
            </>
          )}

          <footer className="page-footer">
            <span>
              <i />
              Datos de demostración · {asOf}
            </span>
            <span className="footer-right">
              Una mirada clara cambia las decisiones. <span>trama.</span>
            </span>
          </footer>
        </div>
      </main>

      <dialog
        ref={dialogRef}
        className="about-dialog"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        aria-labelledby="about-title"
      >
        <button
          className="dialog-close icon-button"
          aria-label="Cerrar información"
          onClick={() => dialogRef.current?.close()}
        >
          <X size={20} />
        </button>
        <Brand />
        <span className="eyebrow">UNA MUESTRA DE LO QUE PODEMOS CONSTRUIR</span>
        <h2 id="about-title">
          Tus datos tienen
          <br />
          una historia para contar.
        </h2>
        <p>
          Esta demo muestra cómo una marca de indumentaria puede conectar sus
          ventas, rentabilidad, inventario y producción para tomar mejores
          decisiones.
        </p>
        <div className="about-notice">
          <Sparkles size={18} />
          <span>
            <strong>Todo lo que ves es ficticio.</strong> Lino Studio, sus
            productos y sus cifras son ejemplos. No se muestran datos de
            clientes reales.
          </span>
        </div>
        <h3>Un dashboard que trabaja como vos.</h3>
        <p>
          Podemos adaptar las métricas, los módulos y el diseño a tu negocio, a
          partir de tus planillas y procesos de trabajo.
        </p>
        <div className="about-features">
          <span>
            <Check size={14} />
            Métricas conectadas
          </span>
          <span>
            <Check size={14} />
            Lectura simple
          </span>
          <span>
            <Check size={14} />
            Decisiones con contexto
          </span>
        </div>
        <p className="about-source">
          {source === "drive"
            ? "Esta muestra se actualiza desde un archivo de datos ficticios en Google Drive."
            : "Esta muestra incluye una copia de datos ficticios para que siempre puedas explorarla."}
        </p>
        <button
          className="dialog-primary"
          onClick={() => dialogRef.current?.close()}
        >
          Explorar la demo <ArrowRight size={16} />
        </button>
      </dialog>
      <span className="sr-only" role="status">
        {exported
          ? "Se descargó el archivo CSV con las ventas del período y canal seleccionados."
          : ""}
      </span>
    </div>
  );
}
