import { ReactNode, ComponentProps } from 'react'
import { cn } from '@/lib/utils'

interface ResponsiveTableProps extends ComponentProps<'div'> {
  children: ReactNode
  /** Convertir a cards en móvil automáticamente */
  cardsOnMobile?: boolean
  /** Ancho mínimo de la tabla */
  minWidth?: string
}

/**
 * Wrapper para tablas con scroll horizontal automático en móvil
 * 
 * @example
 * ```tsx
 * <ResponsiveTable>
 *   <table className="w-full">
 *     <thead>
 *       <tr>
 *         <th>Nombre</th>
 *         <th>Email</th>
 *       </tr>
 *     </thead>
 *     <tbody>
 *       <tr>
 *         <td data-label="Nombre">Juan</td>
 *         <td data-label="Email">juan@example.com</td>
 *       </tr>
 *     </tbody>
 *   </table>
 * </ResponsiveTable>
 * ```
 */
export function ResponsiveTable({ 
  children, 
  className,
  cardsOnMobile = false,
  minWidth = '600px',
  ...props 
}: ResponsiveTableProps) {
  return (
    <div 
      className={cn(
        'table-responsive-wrapper',
        className
      )}
      {...props}
    >
      <div style={{ minWidth: cardsOnMobile ? undefined : minWidth }}>
        {children}
      </div>
    </div>
  )
}

interface ResponsiveTableCardProps extends ComponentProps<'div'> {
  children: ReactNode
}

/**
 * Tabla que se convierte automáticamente en cards en móvil
 * 
 * Requiere que cada <td> tenga atributo data-label con el nombre del header
 * 
 * @example
 * ```tsx
 * <ResponsiveTableCard>
 *   <table className="w-full table-as-cards">
 *     <thead>
 *       <tr>
 *         <th>Cliente</th>
 *         <th>Monto</th>
 *         <th>Estado</th>
 *       </tr>
 *     </thead>
 *     <tbody>
 *       <tr>
 *         <td data-label="Cliente">Juan Pérez</td>
 *         <td data-label="Monto">Q 1,500.00</td>
 *         <td data-label="Estado"><span className="badge">Activo</span></td>
 *       </tr>
 *     </tbody>
 *   </table>
 * </ResponsiveTableCard>
 * ```
 */
export function ResponsiveTableCard({ 
  children, 
  className,
  ...props 
}: ResponsiveTableCardProps) {
  return (
    <div 
      className={cn(
        'w-full overflow-x-auto',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface ResponsiveFormProps extends ComponentProps<'div'> {
  children: ReactNode
  /** Número de columnas en desktop (1-4) */
  columns?: 1 | 2 | 3 | 4
}

/**
 * Grid de formulario que se adapta automáticamente:
 * - Móvil: 1 columna
 * - Tablet: 2 columnas (si columns >= 2)
 * - Desktop: columnas especificadas
 * 
 * @example
 * ```tsx
 * <ResponsiveForm columns={2}>
 *   <div>
 *     <label>Nombre</label>
 *     <input type="text" />
 *   </div>
 *   <div>
 *     <label>Email</label>
 *     <input type="email" />
 *   </div>
 *   <div className="form-field-full">
 *     <label>Dirección</label>
 *     <textarea />
 *   </div>
 * </ResponsiveForm>
 * ```
 */
export function ResponsiveForm({ 
  children, 
  className,
  columns = 2,
  ...props 
}: ResponsiveFormProps) {
  return (
    <div 
      className={cn(
        'form-responsive',
        className
      )}
      style={{
        gridTemplateColumns: '1fr',
      }}
      {...props}
    >
      <style>
        {`
          @media (min-width: 768px) {
            .form-responsive {
              grid-template-columns: repeat(${columns >= 2 ? 2 : 1}, 1fr);
            }
          }
          @media (min-width: 1024px) {
            .form-responsive {
              grid-template-columns: repeat(${columns}, 1fr);
            }
          }
        `}
      </style>
      {children}
    </div>
  )
}

interface ResponsiveFormFieldProps extends ComponentProps<'div'> {
  children: ReactNode
  /** Campo ocupa todo el ancho */
  fullWidth?: boolean
}

/**
 * Campo de formulario responsive
 */
export function ResponsiveFormField({ 
  children, 
  className,
  fullWidth = false,
  ...props 
}: ResponsiveFormFieldProps) {
  return (
    <div 
      className={cn(
        fullWidth && 'form-field-full',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface ResponsiveGridProps extends ComponentProps<'div'> {
  children: ReactNode
  /** Número máximo de columnas en desktop */
  columns?: 2 | 3 | 4
}

/**
 * Grid automático responsive:
 * - Móvil: 1 columna
 * - Tablet: 2 columnas
 * - Desktop: 3-4 columnas según especificado
 * 
 * @example
 * ```tsx
 * <ResponsiveGrid columns={3}>
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 *   <div>Item 3</div>
 * </ResponsiveGrid>
 * ```
 */
export function ResponsiveGrid({ 
  children, 
  className,
  columns = 3,
  ...props 
}: ResponsiveGridProps) {
  return (
    <div 
      className={cn(
        'grid grid-cols-1 gap-4',
        columns >= 2 && 'sm:grid-cols-2',
        columns >= 3 && 'lg:grid-cols-3',
        columns === 4 && 'xl:grid-cols-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface ResponsiveStackProps extends ComponentProps<'div'> {
  children: ReactNode
  /** Dirección en desktop */
  direction?: 'row' | 'column'
  /** Alineación de items */
  align?: 'start' | 'center' | 'end' | 'stretch'
  /** Justificación de items */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around'
}

/**
 * Stack que es vertical en móvil y puede ser horizontal en desktop
 * 
 * @example
 * ```tsx
 * <ResponsiveStack direction="row" justify="between" align="center">
 *   <h2>Título</h2>
 *   <button>Acción</button>
 * </ResponsiveStack>
 * ```
 */
export function ResponsiveStack({ 
  children, 
  className,
  direction = 'row',
  align = 'stretch',
  justify = 'start',
  ...props 
}: ResponsiveStackProps) {
  const alignClasses = {
    start: 'items-start md:items-start',
    center: 'items-center md:items-center',
    end: 'items-end md:items-end',
    stretch: 'items-stretch',
  }

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
  }

  return (
    <div 
      className={cn(
        'flex flex-col gap-4',
        direction === 'row' && 'md:flex-row',
        alignClasses[align],
        justifyClasses[justify],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface ResponsiveContainerProps extends ComponentProps<'div'> {
  children: ReactNode
  /** Tamaño máximo del contenedor */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

/**
 * Contenedor con padding responsive y max-width
 * 
 * @example
 * ```tsx
 * <ResponsiveContainer size="lg">
 *   <h1>Contenido centrado</h1>
 * </ResponsiveContainer>
 * ```
 */
export function ResponsiveContainer({ 
  children, 
  className,
  size = 'lg',
  ...props 
}: ResponsiveContainerProps) {
  const sizeClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    full: 'max-w-full',
  }

  return (
    <div 
      className={cn(
        'main-container',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface ResponsiveDialogProps extends ComponentProps<'div'> {
  children: ReactNode
  /** Tamaño del diálogo */
  size?: 'default' | 'xl'
}

/**
 * Wrapper responsivo para diálogos/modales
 */
export function ResponsiveDialog({ 
  children, 
  className,
  size = 'default',
  ...props 
}: ResponsiveDialogProps) {
  return (
    <div 
      className={cn(
        size === 'default' ? 'dialog-responsive' : 'dialog-responsive-xl',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
