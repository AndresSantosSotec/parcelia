import { Users, Calculator, CreditCard as CreditCardIcon, Package, Wallet, ChartBar, UserCircle, ShoppingCart, Storefront, Tag, Vault, FileText, Handbag, CurrencyDollar, ShieldCheck, Database, Book, Percent, ArrowsLeftRight, ReceiptX, Receipt, Gavel, PaintBrush, TreeStructure, Handshake, Compass, Coins, Bank, IdentificationBadge } from '@phosphor-icons/react'

export const navigation = [
  { id: 'fincas', label: 'Fincas & Lotes', icon: TreeStructure },
  { id: 'compra_fincas', label: 'Compra de fincas', icon: Coins },
  { id: 'financistas', label: 'Financiamientos', icon: Bank },
  { id: 'comisionistas', label: 'Comisionistas', icon: IdentificationBadge },
  { id: 'negociaciones', label: 'Ventas & Contratos', icon: Handshake },
  { id: 'tasas_inmobiliarias', label: 'Tasas & Mora', icon: Percent },
  { id: 'clientes', label: 'Compradores', icon: Users },
  { id: 'simulador', label: 'Simulador Cuotas', icon: Calculator },
  { id: 'caja', label: 'Caja & Cobros', icon: Wallet },
  { id: 'recibos', label: 'Recibos', icon: Receipt },
  { id: 'otros_gastos', label: 'Otros ingresos', icon: CurrencyDollar },
  { id: 'gastos', label: 'Catálogo de Gastos', icon: ReceiptX },
  { id: 'reportes', label: 'Reportes Inmobiliarios', icon: ChartBar },
  { id: 'personalizacion', label: 'Personalización & Logo', icon: PaintBrush },
  { id: 'usuarios', label: 'Usuarios & Asesores', icon: UserCircle },
  { id: 'sucursales', label: 'Sucursales', icon: Storefront },
  { id: 'auditoria', label: 'Auditoría', icon: ShieldCheck },
  { id: 'contabilidad', label: 'Contabilidad', icon: Book },
]
