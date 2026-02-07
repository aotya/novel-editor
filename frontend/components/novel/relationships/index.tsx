'use client';

import React, { useState, useCallback, useRef, useEffect, createContext, useContext } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Background,
  Connection,
  Edge,
  Node,
  NodeTypes,
  EdgeTypes,
  Handle,
  Position,
  useReactFlow,
  Panel,
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import Link from 'next/link';
import styles from './relationships.module.css';
import { saveDiagram } from '@/app/novel/[slug]/relationships/actions';

// --- Context ---
type EditorContextType = {
  openMenu: (edgeId: string, x: number, y: number) => void;
  editLabel: (edgeId: string, currentLabel: string) => void;
};

const EditorContext = createContext<EditorContextType | null>(null);

// --- Custom Node Component ---
const CharacterNode = ({ data }: { data: { label: string, image_url?: string, role?: string } }) => {
  return (
    <div className={styles.nodeCard}>
      {/* Top Handles */}
      <Handle type="target" position={Position.Top} id="top-target" className={styles.handle} />
      <Handle type="source" position={Position.Top} id="top-source" className={styles.handle} />

      {/* Left Handles */}
      <Handle type="target" position={Position.Left} id="left-target" className={styles.handle} />
      <Handle type="source" position={Position.Left} id="left-source" className={styles.handle} />
      
      <div className={styles.nodeHeader} style={{ flexDirection: 'column', gap: '8px', padding: '12px' }}>
         {data.image_url && (
             <div 
                className={styles.characterAvatar}
                style={{ backgroundImage: `url('${data.image_url}')`, width: '40px', height: '40px', margin: '0 auto' }}
             />
         )}
         {!data.image_url && (
            <div className={styles.characterAvatar} style={{width: '40px', height: '40px', margin: '0 auto'}}>
                {data.label[0]}
            </div>
         )}
        <h3 className={styles.nodeTitle}>{data.label}</h3>
        {data.role && <p className={styles.characterRole}>{data.role}</p>}
      </div>
      
      {/* Right Handles */}
      <Handle type="source" position={Position.Right} id="right-source" className={styles.handle} />
      <Handle type="target" position={Position.Right} id="right-target" className={styles.handle} />

      {/* Bottom Handles */}
      <Handle type="source" position={Position.Bottom} id="bottom-source" className={styles.handle} />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className={styles.handle} />
    </div>
  );
};

// --- Custom Edge Component ---
const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  markerStart,
  label,
}: EdgeProps) => {
  const { openMenu, editLabel } = useContext(EditorContext)!;
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onLabelClick = (evt: React.MouseEvent) => {
    evt.stopPropagation();
    editLabel(id, label as string || '');
  };

  const onMenuClick = (evt: React.MouseEvent) => {
    evt.stopPropagation();
    const rect = (evt.target as Element).getBoundingClientRect();
    openMenu(id, rect.left, rect.bottom + 5); 
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} markerStart={markerStart} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div className={styles.relationshipLabelWrapper}>
            <div className={styles.relationshipLabelText} onClick={onLabelClick}>
             {label || 'Relationship'}
            </div>
            <button className={styles.relationshipLabelButton} onClick={onMenuClick}>
              <span className="material-symbols-outlined" style={{fontSize: '14px'}}>settings</span>
            </button>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

const nodeTypes: NodeTypes = {
  character: CharacterNode,
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

type Character = {
  id: string;
  name: string;
  role: string | null;
  image_url: string | null;
  graph_x: number | null;
  graph_y: number | null;
};

type Relationship = {
  id: string;
  source_character_id: string;
  target_character_id: string;
  source_handle: string | null;
  target_handle: string | null;
  label: string | null;
  arrow_type: string;
};

type Props = {
  novel: any;
  initialCharacters: Character[];
  initialRelationships: Relationship[];
};

// --- Context Menu Component ---
const ContextMenu = ({ 
  x, 
  y, 
  onClose, 
  onAction 
}: { 
  x: number; 
  y: number; 
  onClose: () => void; 
  onAction: (action: string) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Cast event.target to Node (DOM Node), not ReactFlow Node
      if (ref.current && !ref.current.contains(event.target as globalThis.Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div 
      ref={ref}
      className={styles.contextMenu} 
      style={{ top: y, left: x, position: 'fixed' }} 
    >
      <div className={styles.contextMenuItem} onClick={() => onAction('forward')}>
        <span className="material-symbols-outlined" style={{fontSize: '16px'}}>arrow_forward</span>
        Forward Arrow
      </div>
      <div className={styles.contextMenuItem} onClick={() => onAction('reverse')}>
        <span className="material-symbols-outlined" style={{fontSize: '16px'}}>arrow_back</span>
        Reverse Arrow
      </div>
      <div className={styles.contextMenuItem} onClick={() => onAction('bidirectional')}>
        <span className="material-symbols-outlined" style={{fontSize: '16px'}}>swap_horiz</span>
        Bi-directional
      </div>
      <div className={styles.contextMenuItem} onClick={() => onAction('none')}>
        <span className="material-symbols-outlined" style={{fontSize: '16px'}}>remove</span>
        No Arrow
      </div>
      <div style={{height: '1px', backgroundColor: 'var(--app-border)', margin: '4px 0'}}></div>
      <div className={`${styles.contextMenuItem} ${styles.contextMenuItemDelete}`} onClick={() => onAction('delete')}>
        <span className="material-symbols-outlined" style={{fontSize: '16px'}}>delete</span>
        Delete Connection
      </div>
    </div>
  );
};

// --- Inner Canvas Component ---
const RelationshipsCanvas = ({ 
    initialCharacters, 
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange, 
    onConnect, 
    setNodes,
    setEdges,
}: {
    initialCharacters: Character[];
    nodes: Node[];
    edges: Edge[];
    onNodesChange: any;
    onEdgesChange: any;
    onConnect: any;
    setNodes: any;
    setEdges: any;
}) => {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { project, zoomIn, zoomOut, fitView } = useReactFlow();
    const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
            const type = 'character';
            const characterData = event.dataTransfer.getData('application/reactflow');

            if (!characterData || !reactFlowBounds) return;

            const character: Character = JSON.parse(characterData);

            const position = project({
                x: event.clientX - reactFlowBounds.left - 75,
                y: event.clientY - reactFlowBounds.top - 40,
            });

            const newNode: Node = {
                id: character.id,
                type,
                position,
                data: { 
                    label: character.name,
                    image_url: character.image_url,
                    role: character.role
                },
            };

            setNodes((nds: Node[]) => {
                const exists = nds.find(n => n.id === newNode.id);
                if (exists) {
                    return nds.map(n => n.id === newNode.id ? { ...n, position } : n);
                }
                return nds.concat(newNode);
            });
        },
        [project, setNodes]
    );

    const openMenu = useCallback((edgeId: string, x: number, y: number) => {
        setMenu({ id: edgeId, x, y });
    }, []);

    const closeMenu = useCallback(() => {
        setMenu(null);
    }, []);

    const editLabel = useCallback((edgeId: string, currentLabel: string) => {
        const newLabel = window.prompt('Enter relationship label:', currentLabel);
        if (newLabel !== null) {
            setEdges((eds: Edge[]) => eds.map((e) => {
                if (e.id === edgeId) {
                    return { ...e, label: newLabel };
                }
                return e;
            }));
        }
    }, [setEdges]);

    const handleMenuAction = (action: string) => {
      if (!menu) return;
      
      const { id } = menu;
      
      setEdges((eds: Edge[]) => {
        if (action === 'delete') {
          return eds.filter((edge) => edge.id !== id);
        }

        return eds.map((edge) => {
          if (edge.id !== id) return edge;
          
          let markerEnd = edge.markerEnd;
          let markerStart = edge.markerStart;
          
          // Helper for markers - using CSS variable for color
          const arrowMarker = { 
            type: MarkerType.ArrowClosed, 
            color: 'var(--app-text-muted)' 
          };

          switch(action) {
            case 'forward':
              markerEnd = arrowMarker;
              markerStart = undefined;
              break;
            case 'reverse':
              markerEnd = undefined;
              markerStart = arrowMarker;
              break;
            case 'bidirectional':
              markerEnd = arrowMarker;
              markerStart = arrowMarker;
              break;
            case 'none':
              markerEnd = undefined;
              markerStart = undefined;
              break;
          }
          
          return { 
             ...edge, 
             markerEnd, 
             markerStart,
             data: { ...edge.data, arrowType: action } // Update data
          };
        });
      });
      
      setMenu(null);
    };

    return (
        <EditorContext.Provider value={{ openMenu, editLabel }}>
        <div className={styles.canvasArea} ref={reactFlowWrapper}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onPaneClick={closeMenu}
                onNodeClick={closeMenu}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                deleteKeyCode={['Backspace', 'Delete']}
            >
                <Background color="var(--app-border)" gap={20} size={1} />
                {menu && <ContextMenu x={menu.x} y={menu.y} onClose={closeMenu} onAction={handleMenuAction} />}
                
                {/* Custom Toolbar */}
                <Panel position="top-left" className={styles.toolbar} style={{margin: '1rem'}}>
                    <button className={styles.toolButton} title="Select Tool">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_selector_tool</span>
                    </button>
                    <button className={styles.toolButton} title="Pan Tool">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>hand_gesture</span>
                    </button>
                    <button className={styles.toolButton} title="Connect Nodes">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>share</span>
                    </button>
                    <div className={styles.toolDivider}></div>
                    <button className={styles.toolButton} onClick={() => zoomIn()} title="Zoom In">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
                    </button>
                    <button className={styles.toolButton} onClick={() => zoomOut()} title="Zoom Out">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>remove</span>
                    </button>
                    <button className={styles.toolButton} onClick={() => fitView()} title="Fit to Screen">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>center_focus_strong</span>
                    </button>
                </Panel>
            </ReactFlow>
        </div>
        </EditorContext.Provider>
    );
};

// --- Main Wrapper Component ---

const RelationshipsEditor = ({ novel, initialCharacters, initialRelationships }: Props) => {
  // Initialize Nodes from Characters with graph_x/y
  const initialNodes: Node[] = initialCharacters
    .filter(c => c.graph_x !== null && c.graph_y !== null)
    .map(c => ({
       id: c.id,
       type: 'character',
       position: { x: c.graph_x!, y: c.graph_y! },
       data: { 
         label: c.name,
         image_url: c.image_url,
         role: c.role 
       }
    }));

  // Initialize Edges from Relationships
  const initialEdges: Edge[] = initialRelationships.map(r => {
     let markerEnd, markerStart;
     const arrowMarker = { 
       type: MarkerType.ArrowClosed, 
       color: 'var(--app-text-muted)' 
     };
     
     switch(r.arrow_type) {
        case 'forward': markerEnd = arrowMarker; break;
        case 'reverse': markerStart = arrowMarker; break;
        case 'bidirectional': markerEnd = arrowMarker; markerStart = arrowMarker; break;
     }

     return {
        id: r.id, // Use DB ID for initial edges
        source: r.source_character_id,
        target: r.target_character_id,
        sourceHandle: r.source_handle,
        targetHandle: r.target_handle,
        type: 'custom',
        label: r.label,
        markerEnd,
        markerStart,
        style: { stroke: 'var(--app-text-muted)', strokeWidth: 2 },
        data: { arrowType: r.arrow_type }
     };
  });

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isSaving, setIsSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Handle mobile resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    handleResize(); // Check on initial load
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Calculate placed character IDs based on current nodes
  const placedCharacterIds = new Set(nodes.map(n => n.id));

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ 
      ...params, 
      type: 'custom',
      label: 'Relationship',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: 'var(--app-text-muted)',
      },
      style: { stroke: 'var(--app-text-muted)', strokeWidth: 2 },
      data: { arrowType: 'forward' }
    }, eds)),
    [setEdges],
  );

  const onDragStart = (event: React.DragEvent, character: Character) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(character));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveDiagram(novel.id, nodes, edges);
      // Optional: Show success toast
    } catch (error) {
      console.error(error);
      alert('Failed to save diagram');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter characters for sidebar
  const unplacedCharacters = initialCharacters.filter(c => !placedCharacterIds.has(c.id));

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
            <Link href="/" className={styles.brand} style={{textDecoration: 'none'}}>
                <div className={styles.logoIcon}>
                <span className="material-symbols-outlined">auto_stories</span>
                </div>
                <div className={styles.brandText}>
                <h2>NovelStudio</h2>
                <p>Project Alpha</p>
                </div>
            </Link>
          <div className={styles.separator}></div>
          <nav className={styles.breadcrumb}>
            <Link href={`/novel/${novel.id}`} className={styles.breadcrumbLink}>
              Novel
            </Link>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--app-text-muted)' }}>chevron_right</span>
            <span className={styles.breadcrumbActive}>Relationship Diagram</span>
          </nav>
        </div>
        <div className={styles.headerRight}>
          <button 
             className={styles.exportButton} 
             onClick={handleSave}
             disabled={isSaving}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                {isSaving ? 'sync' : 'save'}
            </span>
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <div className={styles.avatar} style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuD7FuDXCJrWz7fcTlc5BeGm2NLyA5UYk-cWl9H4KL2XOkYFkASF3pYv2Sv4udx_AfuOueabEs-ZfpR_k5px2_PPH_sbNYLkxA6vFZkKof3LNg-SLnWCd6PwttTlG2d4s5N4xS1bltTOl2-lB7EIwTFW7tNuGldax63mDNSquFVzpEIbzo2kSgwDgP66BU1YLYdu16m-Ec6iLkQmzhX__GywjuMVEwRtXy3cOOiLLDE2X1_9yi8qGIxnYXP3KCWYYCMRnl8UHtIwo1Fq")'}}></div>
        </div>
      </header>

      <div className={styles.main}>
        {/* Sidebar */}
        <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.mobileOpen : ''}`}>
          <div className={styles.sidebarContent}>
            <h3 className={styles.sectionTitle}>Unplaced Characters</h3>
            
            {unplacedCharacters.length === 0 && (
                <p style={{fontSize: '0.8rem', color: 'var(--app-text-muted)', textAlign: 'center'}}>All characters placed</p>
            )}

            {unplacedCharacters.map(char => (
              <div 
                key={char.id}
                className={styles.characterItem}
                draggable
                onDragStart={(event) => onDragStart(event, char)}
              >
                <div 
                    className={styles.characterAvatar}
                    style={char.image_url ? { backgroundImage: `url('${char.image_url}')` } : {}}
                >
                    {!char.image_url && (char.name[0] || '?')}
                </div>
                <div className={styles.characterInfo}>
                  <p className={styles.characterName}>{char.name}</p>
                  <p className={styles.characterRole}>{char.role || 'Unknown Role'}</p>
                </div>
                <span className={`material-symbols-outlined ${styles.dragHandle}`}>drag_indicator</span>
              </div>
            ))}

            <button className={styles.createButton}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              Create New Character
            </button>
          </div>
          
          <div className={styles.sidebarFooter}>
            <div className={styles.tipHeader}>
               <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>info</span>
               <span style={{ fontWeight: 500 }}>Tip:</span>
            </div>
            Drag characters onto the canvas to add them to the diagram.
          </div>
        </aside>

        {/* Canvas Provider Wrapper */}
        <ReactFlowProvider>
            <RelationshipsCanvas 
                initialCharacters={initialCharacters}
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                setNodes={setNodes}
                setEdges={setEdges}
            />
        </ReactFlowProvider>
      </div>

      {/* Mobile Footer & Overlay */}
      <div 
        className={`${styles.mobileOverlay} ${isSidebarOpen ? styles.show : ''}`} 
        onClick={() => setIsSidebarOpen(false)}
      />
      
      <footer className={styles.mobileFooter}>
        <div className={styles.mobileFooterContent}>
          <button 
            className={styles.mobileFooterButton}
            onClick={() => setIsSidebarOpen(true)}
          >
            <span className="material-symbols-outlined">group</span>
            <span>Character List</span>
          </button>
          <button 
            className={`${styles.mobileFooterButton} ${styles.mobileFooterButtonPrimary}`}
            onClick={() => {/* Relationship diagram might not have a direct "add new" here but we follow pattern */}}
          >
            <span className="material-symbols-outlined">person_add</span>
            <span>New Character</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default RelationshipsEditor;
