import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Code2, Hash, Type, MessageSquare, Gift, BookOpen, Users, Package, UserCircle, Mail, Home, Store, Award, Footprints } from 'lucide-react';
import { ImportedTreeNode } from './EditableImportedCanvas';

interface ImportedHierarchyTreeProps {
  tree: ImportedTreeNode[];
  selectedBbId?: string | null;
  inspectedBbId?: string | null;
  onSelect: (bbId: string) => void;
  onEditText: (bbId: string) => void;
}

export const ImportedHierarchyTree: React.FC<ImportedHierarchyTreeProps> = ({
  tree,
  selectedBbId,
  inspectedBbId,
  onSelect,
  onEditText,
}) => {
  const initiallyOpen = useMemo(() => {
    const ids = new Set<string>();
    const walk = (node: ImportedTreeNode, depth: number) => {
      if (depth < 3) ids.add(node.bbId);
      node.children.forEach((c) => walk(c, depth + 1));
    };
    tree.forEach((n) => walk(n, 0));
    return ids;
  }, [tree]);
  const [open, setOpen] = useState<Set<string>>(initiallyOpen);

  useEffect(() => {
    setOpen(initiallyOpen);
  }, [initiallyOpen]);

  const toggle = (bbId: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(bbId)) next.delete(bbId);
      else next.add(bbId);
      return next;
    });
  };

  if (tree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
        <Code2 className="h-8 w-8 text-slate-600 mb-2" />
        <p className="text-xs font-medium text-slate-300">No imported DOM tree yet</p>
        <p className="text-[11px] mt-1 max-w-xs">
          Switch to Editable Canvas to build the inspectable component tree.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="border border-slate-800 bg-slate-950/80 p-1.5 max-h-full overflow-auto font-mono text-[11px]">
        {tree.map((node) => (
          <TreeRow
            key={node.bbId}
            node={node}
            open={open}
            selectedBbId={selectedBbId}
            inspectedBbId={inspectedBbId}
            onToggle={toggle}
            onSelect={onSelect}
            onEditText={onEditText}
          />
        ))}
      </div>
    </div>
  );
};

const TreeRow: React.FC<{
  node: ImportedTreeNode;
  open: Set<string>;
  selectedBbId?: string | null;
  inspectedBbId?: string | null;
  onToggle: (bbId: string) => void;
  onSelect: (bbId: string) => void;
  onEditText: (bbId: string) => void;
}> = ({ node, open, selectedBbId, inspectedBbId, onToggle, onSelect, onEditText }) => {
  const hasChildren = node.children.length > 0;
  const expanded = open.has(node.bbId);
  const selected = selectedBbId === node.bbId;
  const inspected = inspectedBbId === node.bbId;
  const isCommentNode = node.semanticRole !== 'generic' && node.semanticRole.includes('comment');
  const isWishlistNode = node.semanticRole !== 'generic' && node.semanticRole.includes('wishlist');
  const isJournalNode = node.semanticRole !== 'generic' && node.semanticRole.includes('journal');
  const isFriendsNode = node.semanticRole !== 'generic' && (node.semanticRole.includes('friend') || node.semanticRole.includes('friends'));
  const isDetailsNode = node.semanticRole !== 'generic' && node.semanticRole.includes('details');
  const isEquipmentNode = node.semanticRole !== 'generic' && node.semanticRole.includes('equipment');
  const isContactNode = node.semanticRole !== 'generic' && node.semanticRole.includes('contact');
  const isForumNode = node.semanticRole !== 'generic' && node.semanticRole.includes('forum');
  const isSignatureNode = node.semanticRole !== 'generic' && node.semanticRole.includes('signature');
  const isHouseNode = node.semanticRole !== 'generic' && node.semanticRole.includes('house');
  const isFootprintsNode = node.semanticRole !== 'generic' && node.semanticRole.includes('footprints');
  const isAboutNode = node.semanticRole !== 'generic' && node.semanticRole.includes('about');
  const isStoreNode = node.semanticRole !== 'generic' && node.semanticRole.includes('store');
  const isBadgesNode = node.semanticRole !== 'generic' && (node.semanticRole.includes('badge') || node.semanticRole.includes('badges'));

  return (
    <div>
      <div
        className={`group flex items-center gap-1 px-1.5 py-1 cursor-pointer transition-colors ${
          selected
            ? 'bg-indigo-600 text-white shadow'
            : inspected
            ? 'bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/50'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`}
        style={{ paddingLeft: `${4 + node.depth * 12}px` }}
        onClick={() => onSelect(node.bbId)}
        onDoubleClick={() => {
          if (!hasChildren) onEditText(node.bbId);
        }}
        title={`${node.tag}${node.id ? `#${node.id}` : ''}${node.className ? `.${node.className}` : ''}`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle(node.bbId);
          }}
          className="h-4 w-4 flex items-center justify-center text-slate-500 group-hover:text-slate-200 shrink-0"
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
          ) : (
            <Type className="w-3 h-3 opacity-40" />
          )}
        </button>

        <span
          className={`rounded px-1 py-0.5 text-[10px] ${
            isCommentNode
              ? 'bg-cyan-500/20 text-cyan-200'
              : isWishlistNode
              ? 'bg-fuchsia-500/20 text-fuchsia-200'
              : isJournalNode
              ? 'bg-emerald-500/20 text-emerald-200'
              : isFriendsNode
              ? 'bg-amber-500/20 text-amber-200'
              : isDetailsNode
              ? 'bg-blue-500/20 text-blue-200'
              : isEquipmentNode
              ? 'bg-violet-500/20 text-violet-200'
              : isContactNode
              ? 'bg-rose-500/20 text-rose-200'
              : isForumNode
              ? 'bg-slate-500/20 text-slate-200'
              : isSignatureNode
              ? 'bg-pink-500/20 text-pink-200'
              : isHouseNode
              ? 'bg-lime-500/20 text-lime-200'
              : isFootprintsNode
              ? 'bg-sky-500/20 text-sky-200'
              : isAboutNode
              ? 'bg-teal-500/20 text-teal-200'
              : isStoreNode
              ? 'bg-orange-500/20 text-orange-200'
              : isBadgesNode
              ? 'bg-yellow-500/20 text-yellow-200'
              : 'bg-slate-800/80 text-cyan-300'
          }`}
        >
          {isCommentNode && <MessageSquare className="mr-0.5 inline h-2.5 w-2.5" />}
          {isWishlistNode && <Gift className="mr-0.5 inline h-2.5 w-2.5" />}
          {isJournalNode && <BookOpen className="mr-0.5 inline h-2.5 w-2.5" />}
          {isFriendsNode && <Users className="mr-0.5 inline h-2.5 w-2.5" />}
          {isDetailsNode && <UserCircle className="mr-0.5 inline h-2.5 w-2.5" />}
          {isEquipmentNode && <Package className="mr-0.5 inline h-2.5 w-2.5" />}
          {isContactNode && <Mail className="mr-0.5 inline h-2.5 w-2.5" />}
          {isForumNode && <Code2 className="mr-0.5 inline h-2.5 w-2.5" />}
          {isSignatureNode && <Type className="mr-0.5 inline h-2.5 w-2.5" />}
          {isHouseNode && <Home className="mr-0.5 inline h-2.5 w-2.5" />}
          {isFootprintsNode && <Footprints className="mr-0.5 inline h-2.5 w-2.5" />}
          {isAboutNode && <BookOpen className="mr-0.5 inline h-2.5 w-2.5" />}
          {isStoreNode && <Store className="mr-0.5 inline h-2.5 w-2.5" />}
          {isBadgesNode && <Award className="mr-0.5 inline h-2.5 w-2.5" />}
          {node.semanticRole === 'comments-panel'
            ? 'comments'
            : node.semanticRole === 'forum-panel'
            ? 'forums'
            : node.semanticRole === 'signature-panel'
            ? 'signature'
            : node.semanticRole === 'house-panel'
            ? 'house'
            : node.semanticRole === 'footprints-panel'
            ? 'visitors'
            : node.semanticRole === 'about-panel'
            ? 'about'
            : node.semanticRole === 'store-panel'
            ? 'store'
            : node.semanticRole === 'badges-panel'
            ? 'badges'
            : node.semanticRole === 'details-panel'
            ? 'details'
            : node.semanticRole === 'equipment-panel'
            ? 'equipped'
            : node.semanticRole === 'contact-panel'
            ? 'contact'
            : node.semanticRole === 'wishlist-panel'
            ? 'wishlist'
            : node.semanticRole === 'journal-panel'
            ? 'journal'
            : node.semanticRole === 'friends-panel'
            ? 'friends'
            : node.tag}
        </span>
        {node.semanticRole !== 'generic' && !node.semanticRole.endsWith('-panel') && (
          <span
            className={`rounded px-1 py-0.5 text-[9px] truncate max-w-[90px] ${
              isWishlistNode
                ? 'bg-fuchsia-500/10 text-fuchsia-300'
                : isJournalNode
                ? 'bg-emerald-500/10 text-emerald-300'
                : isFriendsNode
                ? 'bg-amber-500/10 text-amber-300'
                : isDetailsNode
                ? 'bg-blue-500/10 text-blue-300'
                : isEquipmentNode
                ? 'bg-violet-500/10 text-violet-300'
                : isContactNode
                ? 'bg-rose-500/10 text-rose-300'
                : isForumNode
                ? 'bg-slate-500/10 text-slate-300'
                : isSignatureNode
                ? 'bg-pink-500/10 text-pink-300'
                : isHouseNode
                ? 'bg-lime-500/10 text-lime-300'
                : isFootprintsNode
                ? 'bg-sky-500/10 text-sky-300'
                : isAboutNode
                ? 'bg-teal-500/10 text-teal-300'
                : isStoreNode
                ? 'bg-orange-500/10 text-orange-300'
                : isBadgesNode
                ? 'bg-yellow-500/10 text-yellow-300'
                : 'bg-cyan-500/10 text-cyan-300'
            }`}
          >
            {node.semanticRole.replace('comment-', '').replace('wishlist-', '').replace('journal-', '').replace('friends-', '').replace('friend-', '').replace('details-', '').replace('equipment-', '').replace('contact-', '').replace('forum-', '').replace('signature-', '').replace('house-', '').replace('footprints-', '').replace('about-', '').replace('store-', '').replace('badges-', '').replace('badge-', '')}
          </span>
        )}
        {node.id && (
          <span className="flex items-center gap-0.5 text-[10px] text-amber-300 truncate max-w-[70px]">
            <Hash className="w-2.5 h-2.5" />{node.id}
          </span>
        )}
        {node.className && (
          <span className="text-[10px] text-purple-300 truncate max-w-[110px]">
            .{node.className.split(/\s+/).slice(0, 2).join('.')}
          </span>
        )}
        {node.text && (
          <span className="text-[10px] text-slate-500 truncate flex-1 min-w-0">
            {node.text}
          </span>
        )}
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <TreeRow
              key={child.bbId}
              node={child}
              open={open}
              selectedBbId={selectedBbId}
              inspectedBbId={inspectedBbId}
              onToggle={onToggle}
              onSelect={onSelect}
              onEditText={onEditText}
            />
          ))}
        </div>
      )}
    </div>
  );
};