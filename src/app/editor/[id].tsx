import { useLocalSearchParams, router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { openTodoDatabase } from '@/lib/todo-database';

type Category = { id: number; name: string };
type Todo = {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
  category_id: number | null;
  status: 'pending' | 'completed';
  reminder_id: string | null;
};

async function saveReminder(
  title: string,
  dueDate: string,
  dueTime: string,
  status: Todo['status'],
  previousReminderId: string | null
) {
  if (Platform.OS === 'web') return previousReminderId;

  try {
    const Notifications = await import('expo-notifications');
    if (previousReminderId) {
      await Notifications.cancelScheduledNotificationAsync(previousReminderId);
    }
    if (!dueDate || !dueTime || status === 'completed') return null;

    const [year, month, day] = dueDate.split('-').map(Number);
    const [hour, minute] = dueTime.split(':').map(Number);
    const triggerDate = new Date(year, month - 1, day, hour, minute);
    if (Number.isNaN(triggerDate.getTime()) || triggerDate <= new Date()) return null;

    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) return null;

    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Tarefa pendente',
        body: title,
        data: { url: '/' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
    });
  } catch {
    return previousReminderId;
  }
}

export default function TaskEditorScreen() {
  const { id: routeId } = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(routeId) ? routeId[0] : routeId;
  const isNew = id === 'new';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [status, setStatus] = useState<Todo['status']>('pending');
  const [reminderId, setReminderId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const db = await openTodoDatabase();
        const categoryRows = await db.getAllAsync<Category>(
          'SELECT id, name FROM categories ORDER BY name COLLATE NOCASE'
        );
        if (!active) return;
        setCategories(categoryRows);
        setCategoryId(categoryRows[0]?.id ?? null);

        if (!isNew) {
          const taskId = Number(id);
          if (!Number.isSafeInteger(taskId) || taskId < 1) {
            throw new Error('O identificador desta tarefa é inválido.');
          }
          const task = await db.getFirstAsync<Todo>('SELECT * FROM tasks WHERE id = ?', taskId);
          if (!task) throw new Error('Esta tarefa não foi encontrada.');
          if (!active) return;
          setTitle(task.title);
          setDescription(task.description ?? '');
          setDueDate(task.due_date ?? '');
          setDueTime(task.due_time ?? '');
          setCategoryId(task.category_id);
          setStatus(task.status);
          setReminderId(task.reminder_id);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Não foi possível abrir a tarefa.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [id, isNew]);

  async function handleSave() {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Informe um título para a tarefa.');
      return;
    }
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      setError('Use o formato AAAA-MM-DD para a data.');
      return;
    }
    if (dueTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(dueTime)) {
      setError('Use o formato HH:MM para a hora.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const db = await openTodoDatabase();
      let taskId = isNew ? 0 : Number(id);
      if (isNew) {
        const result = await db.runAsync(
          `INSERT INTO tasks (title, description, due_date, due_time, category_id, status)
           VALUES (?, ?, ?, ?, ?, ?)`,
          cleanTitle,
          description.trim() || null,
          dueDate || null,
          dueTime || null,
          categoryId,
          status
        );
        taskId = result.lastInsertRowId;
      } else {
        await db.runAsync(
          `UPDATE tasks
           SET title = ?, description = ?, due_date = ?, due_time = ?, category_id = ?, status = ?
           WHERE id = ?`,
          cleanTitle,
          description.trim() || null,
          dueDate || null,
          dueTime || null,
          categoryId,
          status,
          taskId
        );
      }

      const nextReminderId = await saveReminder(cleanTitle, dueDate, dueTime, status, reminderId);
      await db.runAsync('UPDATE tasks SET reminder_id = ? WHERE id = ?', nextReminderId, taskId);
      router.push('/' as Href);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar a tarefa.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (isNew) return;
    setSaving(true);
    setError('');
    try {
      if (Platform.OS !== 'web' && reminderId) {
        try {
          const Notifications = await import('expo-notifications');
          await Notifications.cancelScheduledNotificationAsync(reminderId);
        } catch {
          // A falha do lembrete não deve impedir a exclusão da tarefa.
        }
      }
      const db = await openTodoDatabase();
      await db.runAsync('DELETE FROM tasks WHERE id = ?', Number(id));
      router.push('/' as Href);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Não foi possível excluir a tarefa.');
      setConfirmDelete(false);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (router.canGoBack()) router.back();
    else router.push('/' as Href);
  }

  const selectedCategory = categories.find((category) => category.id === categoryId);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>{isNew ? 'NOVA TAREFA' : 'TAREFA'}</Text>
            <Text style={styles.headingTitle}>{isNew ? 'Organize o próximo passo' : 'Editar tarefa'}</Text>
          </View>

          {loading ? (
            <ActivityIndicator color="#18745A" size="large" style={styles.loader} />
          ) : (
            <>
              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={styles.label}>Título <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    accessibilityLabel="Título da tarefa"
                    autoFocus={isNew}
                    maxLength={120}
                    onChangeText={setTitle}
                    placeholder="Ex.: Entregar trabalho de cálculo"
                    placeholderTextColor="#858B86"
                    returnKeyType="next"
                    style={styles.input}
                    value={title}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Descrição</Text>
                  <TextInput
                    accessibilityLabel="Descrição da tarefa"
                    multiline
                    onChangeText={setDescription}
                    placeholder="Adicione detalhes ou observações"
                    placeholderTextColor="#858B86"
                    style={[styles.input, styles.descriptionInput]}
                    textAlignVertical="top"
                    value={description}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Prazo</Text>
                  <View style={styles.dateRow}>
                    <TextInput
                      accessibilityLabel="Data de vencimento"
                      onChangeText={setDueDate}
                      placeholder="AAAA-MM-DD"
                      placeholderTextColor="#858B86"
                      style={[styles.input, styles.dateInput]}
                      value={dueDate}
                    />
                    <TextInput
                      accessibilityLabel="Hora de vencimento"
                      keyboardType="numbers-and-punctuation"
                      onChangeText={setDueTime}
                      placeholder="HH:MM"
                      placeholderTextColor="#858B86"
                      style={[styles.input, styles.timeInput]}
                      value={dueTime}
                    />
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Categoria</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: categoryPickerOpen }}
                    onPress={() => setCategoryPickerOpen((open) => !open)}
                    style={styles.selectButton}>
                    <Text style={selectedCategory ? styles.selectText : styles.placeholder}>
                      {selectedCategory?.name ?? 'Sem categoria'}
                    </Text>
                    <Text style={styles.chevron}>{categoryPickerOpen ? '⌃' : '⌄'}</Text>
                  </Pressable>
                  {categoryPickerOpen && (
                    <View style={styles.options}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          setCategoryId(null);
                          setCategoryPickerOpen(false);
                        }}
                        style={styles.option}>
                        <Text style={styles.optionText}>Sem categoria</Text>
                      </Pressable>
                      {categories.map((category) => (
                        <Pressable
                          accessibilityRole="button"
                          key={category.id}
                          onPress={() => {
                            setCategoryId(category.id);
                            setCategoryPickerOpen(false);
                          }}
                          style={styles.option}>
                          <Text style={styles.optionText}>{category.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Status</Text>
                  <View style={styles.statusRow}>
                    {(['pending', 'completed'] as const).map((value) => {
                      const selected = status === value;
                      return (
                        <Pressable
                          accessibilityRole="radio"
                          accessibilityState={{ selected }}
                          key={value}
                          onPress={() => setStatus(value)}
                          style={[styles.statusOption, selected && styles.statusOptionSelected]}>
                          <Text style={[styles.statusText, selected && styles.statusTextSelected]}>
                            {value === 'pending' ? 'Pendente' : 'Concluída'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>

              {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}

              {confirmDelete && (
                <View style={styles.confirmBox}>
                  <Text style={styles.confirmText}>Excluir esta tarefa permanentemente?</Text>
                  <View style={styles.confirmActions}>
                    <Pressable accessibilityRole="button" onPress={() => setConfirmDelete(false)} style={styles.cancelDeleteButton}>
                      <Text style={styles.cancelDeleteText}>Manter tarefa</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" disabled={saving} onPress={handleDelete} style={styles.deleteButton}>
                      <Text style={styles.deleteButtonText}>Confirmar exclusão</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              <View style={styles.actions}>
                <Pressable accessibilityRole="button" disabled={saving} onPress={handleCancel} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Cancelar</Text>
                </Pressable>
                <Pressable accessibilityRole="button" disabled={saving} onPress={handleSave} style={styles.saveButton}>
                  {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Salvar</Text>}
                </Pressable>
              </View>

              {!isNew && !confirmDelete && (
                <Pressable accessibilityRole="button" disabled={saving} onPress={() => setConfirmDelete(true)} style={styles.deleteLink}>
                  <Text style={styles.deleteLinkText}>Excluir tarefa</Text>
                </Pressable>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F6F2' },
  flex: { flex: 1 },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: 24, paddingBottom: 40 },
  heading: { marginBottom: 28 },
  eyebrow: { color: '#18745A', fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },
  headingTitle: { color: '#18231E', fontSize: 28, fontWeight: '700' },
  loader: { marginTop: 64 },
  form: { gap: 20 },
  field: { gap: 8 },
  label: { color: '#27332D', fontSize: 14, fontWeight: '600' },
  required: { color: '#B5473A' },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#D8DED9',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    color: '#18231E',
    fontSize: 16,
    paddingHorizontal: 14,
  },
  descriptionInput: { minHeight: 112, paddingTop: 13 },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateInput: { flex: 1 },
  timeInput: { width: 112 },
  selectButton: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#D8DED9',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  selectText: { color: '#18231E', fontSize: 16 },
  placeholder: { color: '#858B86', fontSize: 16 },
  chevron: { color: '#526159', fontSize: 19 },
  options: { borderWidth: 1, borderColor: '#D8DED9', borderRadius: 8, backgroundColor: '#FFFFFF' },
  option: { minHeight: 46, justifyContent: 'center', paddingHorizontal: 14 },
  optionText: { color: '#27332D', fontSize: 15 },
  statusRow: { flexDirection: 'row', gap: 10 },
  statusOption: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D8DED9',
    backgroundColor: '#FFFFFF',
  },
  statusOptionSelected: { borderColor: '#18745A', backgroundColor: '#E4F1EA' },
  statusText: { color: '#526159', fontSize: 15, fontWeight: '600' },
  statusTextSelected: { color: '#145A46' },
  error: { color: '#A5342A', fontSize: 14, lineHeight: 20, marginTop: 16 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 28 },
  secondaryButton: {
    minHeight: 50,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C9D1CB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: { color: '#27332D', fontSize: 15, fontWeight: '600' },
  saveButton: {
    minHeight: 50,
    flex: 1.3,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#18745A',
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  deleteLink: { alignSelf: 'center', padding: 14, marginTop: 8 },
  deleteLinkText: { color: '#A5342A', fontSize: 14, fontWeight: '600' },
  confirmBox: { marginTop: 18, borderRadius: 8, backgroundColor: '#FCECE9', padding: 16, gap: 12 },
  confirmText: { color: '#702A23', fontSize: 14, fontWeight: '600' },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' },
  cancelDeleteButton: { paddingHorizontal: 12, paddingVertical: 10 },
  cancelDeleteText: { color: '#702A23', fontSize: 14, fontWeight: '600' },
  deleteButton: { borderRadius: 6, backgroundColor: '#A5342A', paddingHorizontal: 12, paddingVertical: 10 },
  deleteButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});