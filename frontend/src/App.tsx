import {
  CalendarOutlined,
  CheckSquareOutlined,
  ClearOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  FormOutlined,
  InboxOutlined,
  LinkOutlined,
  TableOutlined,
  PlusCircleOutlined,
  PlusOutlined,
  StarOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  App as AntApp,
  Button,
  Card,
  Checkbox,
  ConfigProvider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Layout,
  Menu,
  Modal,
  Popconfirm,
  QRCode,
  Result,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  Upload,
} from 'antd';
import zhCN from 'antd/locale/zh_CN';
import type { UploadProps } from 'antd';
import axios from 'axios';
import Papa from 'papaparse';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ClipboardEvent, ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';
const FILE_BASE = API.replace(/\/api$/, '');

type SurveyKind = 'case_collection' | 'assessment' | 'promotional_document';
type QuestionType = 'radio' | 'checkbox' | 'rating' | 'description' | 'text' | 'textarea' | 'file' | 'date' | 'datetime';

type Question = {
  id: string;
  type: QuestionType;
  label: string;
  description?: string;
  required?: boolean;
  options?: string[];
  maxScore?: number;
  visibleWhen?: { questionId: string; valueIn: string[] };
};

type SurveySchema = {
  questions: Question[];
  contentHtml?: string;
};

type Survey = {
  id: number;
  title: string;
  type: SurveyKind;
  status: 'draft' | 'published' | 'disabled';
  shareToken: string;
  schemaJson: SurveySchema;
  createdAt: string;
};

const http = axios.create({ baseURL: API });
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

async function downloadFile(path: string, filename: string) {
  const response = await http.get(path, { responseType: 'blob' });
  const contentType = String(response.headers['content-type'] || 'text/csv;charset=utf-8;');
  const blob = new Blob([response.data], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const surveyTypeOptions = [
  { label: '问卷考核', value: 'assessment' },
  { label: '案例收集', value: 'case_collection' },
  { label: '宣传文档类', value: 'promotional_document' },
] satisfies Array<{ label: string; value: SurveyKind }>;

const paletteOptions: Array<{ type: QuestionType; label: string; icon: ReactNode }> = [
  { type: 'radio', label: '单选', icon: <span>◎</span> },
  { type: 'checkbox', label: '多选', icon: <CheckSquareOutlined /> },
  { type: 'rating', label: '评分打分', icon: <StarOutlined /> },
  { type: 'description', label: '文本描述', icon: <FileTextOutlined /> },
  { type: 'text', label: '单行文本', icon: <FormOutlined /> },
  { type: 'textarea', label: '多行文本', icon: <FileTextOutlined /> },
  { type: 'file', label: '图片/文件', icon: <UploadOutlined /> },
  { type: 'date', label: '日期/时间', icon: <CalendarOutlined /> },
];

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <AntApp>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/s/:shareToken" element={<FillPage />} />
            <Route path="/success" element={<Result status="success" title="提交成功" />} />
            <Route path="/*" element={<AdminShell />} />
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { message } = AntApp.useApp();

  async function onFinish(values: { phone: string; password: string }) {
    try {
      const { data } = await http.post('/admin/auth/login', values);
      localStorage.setItem('token', data.token);
      localStorage.setItem('admin', JSON.stringify(data.admin));
      navigate('/surveys');
    } catch (error: any) {
      message.error(error.response?.data?.message || '登录失败');
    }
  }

  return (
    <div className="login-page">
      <div className="login-panel">
        <Typography.Title level={3}>内部问卷系统</Typography.Title>
        <Typography.Paragraph type="secondary">默认账号：13800000000 / admin123456</Typography.Paragraph>
        <Form layout="vertical" onFinish={onFinish} initialValues={{ phone: '13800000000', password: 'admin123456' }}>
          <Form.Item name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            登录
          </Button>
        </Form>
      </div>
    </div>
  );
}

function AdminShell() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;

  return (
    <Layout className="app-shell">
      <Layout.Sider width={208} theme="light">
        <div style={{ padding: 20, fontWeight: 700 }}>内部问卷系统</div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={({ key }) => navigate(key)}
          items={[
            { key: '/surveys', label: '问卷管理' },
            { key: '/contacts', label: '联系人' },
            { key: '/members', label: '后台成员' },
          ]}
        />
      </Layout.Sider>
      <Layout>
        <Layout.Header style={{ background: '#fff', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Button
            onClick={() => {
              localStorage.clear();
              navigate('/login');
            }}
          >
            退出登录
          </Button>
        </Layout.Header>
        <Layout.Content style={{ padding: 24 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/surveys" />} />
            <Route path="/surveys" element={<SurveyList />} />
            <Route path="/surveys/new" element={<SurveyEditor />} />
            <Route path="/surveys/:id/edit" element={<SurveyEditor />} />
            <Route path="/surveys/:id/share" element={<SharePage />} />
            <Route path="/surveys/:id/responses" element={<ResponsesPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/members" element={<MembersPage />} />
          </Routes>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}

function SurveyList() {
  const navigate = useNavigate();
  const { message } = AntApp.useApp();
  const [data, setData] = useState<Survey[]>([]);
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState<SurveyKind | undefined>();

  async function load(filters?: { keyword?: string; type?: SurveyKind }) {
    const nextKeyword = filters?.keyword ?? keyword;
    const nextType = filters?.type ?? type;
    const res = await http.get('/admin/surveys', { params: { keyword: nextKeyword, type: nextType } });
    setData(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(survey: Survey, checked: boolean) {
    await http.put(`/admin/surveys/${survey.id}/status`, { status: checked ? 'published' : 'disabled' });
    message.success('状态已更新');
    load();
  }

  return (
    <>
      <div className="toolbar">
        <h1 className="page-title">问卷管理</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/surveys/new')}>
          新建问卷
        </Button>
      </div>
      <Card>
        <div className="toolbar">
          <div className="toolbar-left">
            <Input.Search
              placeholder="搜索问卷名称"
              allowClear
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onSearch={(value) => {
                setKeyword(value);
                load({ keyword: value });
              }}
              style={{ width: 240 }}
            />
            <Select
              allowClear
              placeholder="类型"
              style={{ width: 180 }}
              value={type}
              onChange={(value) => {
                setType(value);
                load({ type: value });
              }}
              options={surveyTypeOptions}
            />
            <Button onClick={() => load({ keyword, type })}>搜索</Button>
          </div>
        </div>
        <Table
          rowKey="id"
          dataSource={data}
          columns={[
            { title: '问卷名称', dataIndex: 'title' },
            {
              title: '类型',
              dataIndex: 'type',
              render: (value: SurveyKind) => <Tag color={surveyTypeColor(value)}>{surveyTypeLabel(value)}</Tag>,
            },
            {
              title: '启用状态',
              dataIndex: 'status',
              render: (_: unknown, row: Survey) => (
                <Switch
                  checked={row.status === 'published'}
                  checkedChildren="已启用"
                  unCheckedChildren="未启用"
                  onChange={(checked) => setStatus(row, checked)}
                />
              ),
            },
            { title: '创建时间', dataIndex: 'createdAt', render: (value: string) => new Date(value).toLocaleString() },
            {
              title: '操作',
              render: (_: unknown, row: Survey) => (
                <Space>
                  <Button icon={<EditOutlined />} onClick={() => navigate(`/surveys/${row.id}/edit`)}>
                    编辑
                  </Button>
                  <Button icon={<LinkOutlined />} onClick={() => navigate(`/surveys/${row.id}/share`)}>
                    分享
                  </Button>
                  <Button icon={<EyeOutlined />} onClick={() => navigate(`/surveys/${row.id}/responses`)}>
                    数据
                  </Button>
                  <Button icon={<DownloadOutlined />} onClick={() => downloadFile(`/admin/surveys/${row.id}/export`, `survey-${row.id}.csv`)}>
                    导出 CSV
                  </Button>
                  <Popconfirm title="确认删除该问卷？" onConfirm={async () => { await http.delete(`/admin/surveys/${row.id}`); load(); }}>
                    <Button danger icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}

function SurveyEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { message } = AntApp.useApp();
  const [form] = Form.useForm<{ title: string; type: SurveyKind }>();
  const surveyType = Form.useWatch('type', form) || 'assessment';
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [contentHtml, setContentHtml] = useState('');
  const [saving, setSaving] = useState(false);
  const activeQuestionType = questions.find((item) => item.id === activeId)?.type;

  useEffect(() => {
    if (!id) return;
    http.get(`/admin/surveys/${id}`).then(({ data }: { data: Survey }) => {
      form.setFieldsValue({ title: data.title, type: data.type });
      setQuestions(data.schemaJson?.questions || []);
      setActiveId(data.schemaJson?.questions?.[0]?.id);
      setContentHtml(data.schemaJson?.contentHtml || '');
    });
  }, [id]);

  function addQuestion(type: QuestionType) {
    const next: Question = {
      id: `q${Date.now()}`,
      type,
      label: '',
      description: type === 'description' ? '请输入考题说明' : '',
      required: false,
      options: type === 'radio' || type === 'checkbox' ? ['选项'] : [],
      maxScore: type === 'rating' ? 10 : undefined,
    };
    setQuestions((prev) => [...prev, next]);
    setActiveId(next.id);
  }

  async function save(publish = false) {
    if (saving) return;
    const values = await form.validateFields();

    setSaving(true);
    try {
      if (values.type === 'promotional_document') {
        if (!stripHtml(contentHtml).trim()) {
          message.error('请填写宣传文档内容');
          return;
        }
        const payload = {
          ...values,
          schemaJson: {
            questions: [],
            contentHtml,
          },
        };
        const res = id ? await http.put(`/admin/surveys/${id}`, payload) : await http.post('/admin/surveys', payload);
        if (publish) {
          await http.post(`/admin/surveys/${res.data.id}/publish`);
          message.success('已发布');
          navigate('/surveys');
        } else {
          navigate(`/surveys/${res.data.id}/share`);
        }
        return;
      }

      const normalized = questions.map((question) => ({
        ...question,
        label: question.type === 'description' ? (question.description || '').trim() : question.label?.trim(),
        description: question.description?.trim() || '',
        options: ['radio', 'checkbox'].includes(question.type)
          ? (question.options || []).map((item) => item.trim()).filter(Boolean)
          : [],
        maxScore: question.type === 'rating' ? 10 : question.maxScore,
      }));

      if (normalized.some((question) => !question.label)) {
        message.error('请补全题目标题');
        return;
      }
      if (normalized.some((question) => ['radio', 'checkbox'].includes(question.type) && (question.options || []).length === 0)) {
        message.error('选择题至少需要一个选项');
        return;
      }

      const payload = { ...values, schemaJson: { questions: normalized, contentHtml: '' } };
      const res = id ? await http.put(`/admin/surveys/${id}`, payload) : await http.post('/admin/surveys', payload);
      if (publish) {
        await http.post(`/admin/surveys/${res.data.id}/publish`);
        message.success('已发布');
        navigate('/surveys');
      } else {
        navigate(`/surveys/${res.data.id}/share`);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <h1 className="page-title">{id ? '编辑问卷' : '新建问卷'}</h1>
      <div className="builder-layout">
        <aside className="builder-palette">
          {surveyType !== 'promotional_document' ? (
            <>
              <Typography.Text className="palette-title">选择题型</Typography.Text>
              <div className="palette-grid">
                {paletteOptions.slice(0, 3).map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    className={`palette-button ${activeQuestionType === item.type ? 'active' : ''}`}
                    onClick={() => addQuestion(item.type)}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
              <Typography.Text className="palette-title">文本输入</Typography.Text>
              <div className="palette-grid">
                {paletteOptions.slice(3, 6).map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    className={`palette-button ${activeQuestionType === item.type ? 'active' : ''}`}
                    onClick={() => addQuestion(item.type)}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
              <Typography.Text className="palette-title">高级题型</Typography.Text>
              <div className="palette-grid">
                {paletteOptions.slice(6).map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    className={`palette-button ${activeQuestionType === item.type ? 'active' : ''}`}
                    onClick={() => addQuestion(item.type)}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <Typography.Text className="palette-title">宣传文档说明</Typography.Text>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                这种类型用于发布培训资料、入职指引、宣传内容等。编辑器支持标题、段落、链接和图片排版，发布后前台按富文本内容展示，不要求填写答卷。
              </Typography.Paragraph>
            </>
          )}
        </aside>

        <main className="builder-canvas">
          <Card className="survey-meta-card">
            <Form form={form} layout="vertical" initialValues={{ type: 'assessment' }}>
              <Form.Item name="title" label="问卷名称" rules={[{ required: true, message: '请输入问卷名称' }]}>
                <Input placeholder="请输入问卷名称" />
              </Form.Item>
              <Form.Item name="type" label="类型标签" rules={[{ required: true, message: '请选择类型标签' }]}>
                <Select options={surveyTypeOptions} />
              </Form.Item>
            </Form>
          </Card>

          {surveyType === 'promotional_document' ? (
            <RichTextSurveyEditor value={contentHtml} onChange={setContentHtml} />
          ) : (
            <div className="question-canvas">
              {questions.length === 0 ? (
                <div className="empty-builder">
                  <Typography.Title level={4}>从左侧选择题型开始创建问卷</Typography.Title>
                  <Typography.Text type="secondary">支持单选、多选、评分、文本、附件和日期题。</Typography.Text>
                </div>
              ) : (
                questions.map((question, index) => (
                  <QuestionEditor
                    key={question.id}
                    active={activeId === question.id}
                    question={question}
                    questions={questions}
                    onActivate={() => setActiveId(question.id)}
                    onChange={(next) => setQuestions((prev) => prev.map((item) => (item.id === question.id ? next : item)))}
                    onDelete={() => {
                      setQuestions((prev) => prev.filter((item) => item.id !== question.id));
                      if (activeId === question.id) {
                        setActiveId(undefined);
                      }
                    }}
                    index={index}
                  />
                ))
              )}
            </div>
          )}
        </main>

        <aside className="builder-actions">
          <Card title="操作">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button type="primary" block loading={saving} disabled={saving} onClick={() => save(false)}>
                分享
              </Button>
              <Button block loading={saving} disabled={saving} onClick={() => save(true)}>
                发布
              </Button>
              <Button block onClick={() => navigate('/surveys')}>
                返回
              </Button>
            </Space>
          </Card>
        </aside>
      </div>
    </>
  );
}

function RichTextSurveyEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { message } = AntApp.useApp();

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  function syncEditor() {
    onChange(editorRef.current?.innerHTML || '');
  }

  function runCommand(command: string, commandValue?: string) {
    if (typeof document === 'undefined') return;
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    syncEditor();
  }

  function insertLink() {
    const url = window.prompt('请输入链接地址');
    if (url) runCommand('createLink', url);
  }

  async function uploadRichImage(file: File) {
    if (!file.type.startsWith('image/')) {
      message.error('请选择图片文件');
      return '';
    }
    if (file.size > 20 * 1024 * 1024) {
      message.error('图片不能超过 20MB');
      return '';
    }

    const formData = new FormData();
    formData.append('file', file);
    const { data } = await http.post('/uploads', formData);
    return `${FILE_BASE}${data.url}`;
  }

  function insertHtml(html: string) {
    if (typeof document === 'undefined') return;
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, html);
    syncEditor();
  }

  async function insertImageFile(file: File) {
    setUploading(true);
    try {
      const url = await uploadRichImage(file);
      if (url) insertHtml(`<img src="${url}" alt="${file.name}" />`);
    } catch {
      message.error('图片上传失败，请稍后重试');
    } finally {
      setUploading(false);
    }
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) await insertImageFile(file);
  }

  async function replaceDataImages(html: string) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const images = Array.from(doc.querySelectorAll('img[src^="data:image/"]'));
    for (const image of images) {
      const src = image.getAttribute('src');
      if (!src) continue;
      const blob = await fetch(src).then((res) => res.blob());
      const extension = blob.type.split('/')[1] || 'png';
      const file = new File([blob], `pasted-${Date.now()}.${extension}`, { type: blob.type });
      const url = await uploadRichImage(file);
      if (url) image.setAttribute('src', url);
    }
    return doc.body.innerHTML;
  }

  async function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const imageItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith('image/'));
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) {
        event.preventDefault();
        await insertImageFile(file);
        return;
      }
    }

    const html = event.clipboardData.getData('text/html');
    if (html.includes('data:image/')) {
      event.preventDefault();
      setUploading(true);
      try {
        insertHtml(await replaceDataImages(html));
      } catch {
        message.error('粘贴图片处理失败，请使用上传图片按钮');
      } finally {
        setUploading(false);
      }
      return;
    }

    setTimeout(syncEditor);
  }

  function insertTable() {
    const rows = Number(window.prompt('请输入表格行数', '3') || 0);
    const cols = Number(window.prompt('请输入表格列数', '3') || 0);
    if (!rows || !cols) return;

    const safeRows = Math.min(Math.max(rows, 1), 12);
    const safeCols = Math.min(Math.max(cols, 1), 8);
    const cells = Array.from({ length: safeCols }, () => '<td><br /></td>').join('');
    const tableRows = Array.from({ length: safeRows }, () => `<tr>${cells}</tr>`).join('');
    insertHtml(`<table><tbody>${tableRows}</tbody></table><p><br /></p>`);
  }

  function clearFormat() {
    runCommand('removeFormat');
    runCommand('unlink');
  }

  return (
    <div className="question-canvas">
      <div className="rich-editor-shell">
        <div className="rich-editor-toolbar">
          <Button size="small" onClick={() => runCommand('bold')}>
            加粗
          </Button>
          <Button size="small" onClick={() => runCommand('insertUnorderedList')}>
            无序列表
          </Button>
          <Button size="small" onClick={() => runCommand('formatBlock', '<h1>')}>
            大标题
          </Button>
          <Button size="small" onClick={() => runCommand('formatBlock', '<h2>')}>
            小标题
          </Button>
          <Button size="small" icon={<LinkOutlined />} onClick={insertLink}>
            链接
          </Button>
          <Button size="small" icon={<UploadOutlined />} loading={uploading} onClick={() => fileInputRef.current?.click()}>
            图片
          </Button>
          <Button size="small" icon={<TableOutlined />} onClick={insertTable}>
            表格
          </Button>
          <Button size="small" icon={<ClearOutlined />} onClick={clearFormat}>
            清除格式
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageChange} />
        </div>
        <div
          ref={editorRef}
          className="rich-editor-content"
          contentEditable
          suppressContentEditableWarning
          onInput={(event) => onChange((event.target as HTMLDivElement).innerHTML)}
          onPaste={handlePaste}
          data-placeholder="请输入宣传文档内容，可包含标题、段落、链接、图片说明等。"
        />
      </div>
      <div className="rich-preview-card">
        <Typography.Title level={5}>预览</Typography.Title>
        <div className="rich-preview-body" dangerouslySetInnerHTML={{ __html: value || '<p style="color:#999">这里会显示文档预览</p>' }} />
      </div>
    </div>
  );
}

function QuestionEditor({
  active,
  question,
  questions,
  onActivate,
  onChange,
  onDelete,
  index,
}: {
  active: boolean;
  question: Question;
  questions: Question[];
  onActivate: () => void;
  onChange: (question: Question) => void;
  onDelete: () => void;
  index: number;
}) {
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [logicOpen, setLogicOpen] = useState(Boolean(question.visibleWhen));
  const optionQuestions = questions.filter((item) => ['radio', 'checkbox'].includes(item.type) && item.id !== question.id);
  const parent = optionQuestions.find((item) => item.id === question.visibleWhen?.questionId);
  const isChoice = ['radio', 'checkbox'].includes(question.type);

  function updateOption(optionIndex: number, value: string) {
    const options = [...(question.options || [])];
    options[optionIndex] = value;
    onChange({ ...question, options });
  }

  function removeOption(optionIndex: number) {
    onChange({ ...question, options: (question.options || []).filter((_, idx) => idx !== optionIndex) });
  }

  function openBatch() {
    setBatchText((question.options || []).join('\n'));
    setBatchOpen(true);
  }

  function applyBatch() {
    onChange({
      ...question,
      options: batchText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
    });
    setBatchOpen(false);
  }

  return (
    <div className={`builder-question ${active ? 'active' : ''}`} onClick={onActivate}>
      <div className="question-head">
        <div className="question-heading">
          <div className="question-heading-main">
            <Typography.Text className="question-number">
              {question.required && <span className="required-mark">*</span>}
              {index + 1}
            </Typography.Text>
            {question.type !== 'description' ? (
              <QuestionTitleTextArea value={question.label} onChange={(value) => onChange({ ...question, label: value })} />
            ) : (
              <Typography.Text strong className="question-heading-title">{question.label || '请输入题目标题'}</Typography.Text>
            )}
            <span className="question-type-tag">{typeLabel(question.type)}</span>
          </div>
        </div>
        <Popconfirm title="确认删除这道题？" onConfirm={onDelete}>
          <Button className="question-delete-button" size="small" icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      </div>

      <Form layout="vertical" style={{ marginTop: 12 }}>
        {question.type === 'description' ? (
          <Form.Item label="文本描述" required>
            <Input.TextArea
              rows={5}
              value={question.description}
              placeholder="请输入考题说明"
              onChange={(event) => onChange({ ...question, label: event.target.value, description: event.target.value })}
            />
          </Form.Item>
        ) : (
          <>
            <Input
              variant="borderless"
              className="question-desc-input"
              value={question.description}
              placeholder="请输入题目说明（选填）"
              onChange={(event) => onChange({ ...question, description: event.target.value })}
            />
          </>
        )}

        {isChoice && (
          <div className="option-editor">
            {(question.options || []).map((option, optionIndex) => (
              <div className="option-row" key={`${question.id}-${optionIndex}`}>
                <span className={`choice-symbol ${question.type === 'checkbox' ? 'checkbox-symbol' : ''}`} />
                <Input
                  variant="borderless"
                  className="option-input"
                  value={option}
                  placeholder="选项"
                  onChange={(event) => updateOption(optionIndex, event.target.value)}
                />
                <Button className="option-delete-button" type="text" danger icon={<DeleteOutlined />} onClick={() => removeOption(optionIndex)} />
              </div>
            ))}
            <Space className="option-actions" split={<span className="option-action-divider">|</span>}>
              <Button
                className="option-action-button"
                type="text"
                icon={<PlusCircleOutlined />}
                onClick={() => onChange({ ...question, options: [...(question.options || []), '选项'] })}
              >
                添加选项
              </Button>
              <Button className="option-action-button" type="text" onClick={openBatch}>
                批量编辑
              </Button>
            </Space>
          </div>
        )}

        {question.type === 'text' && <Input placeholder="填写者将在这里输入单行文本" disabled />}
        {question.type === 'textarea' && <Input.TextArea rows={4} placeholder="填写者将在这里输入多行文本" disabled />}
        {question.type === 'rating' && (
          <div className="rating-preview">
            <div className="rating-help">评分范围默认为 10 分，填写者可选择 1-10 分</div>
            <div className="rating-labels">
              <span>非常不满意</span>
              <span>非常满意</span>
            </div>
            <div className="rating-scale">
              {Array.from({ length: 10 }, (_, score) => (
                <button key={score + 1} type="button" className="rating-score" disabled>
                  {score + 1}
                </button>
              ))}
            </div>
          </div>
        )}
        {question.type === 'file' && (
          <Button disabled icon={<UploadOutlined />}>
            填写者上传文件
          </Button>
        )}
        {(question.type === 'date' || question.type === 'datetime') && <input className="native-date" disabled placeholder="填写者选择日期" />}

        {question.type !== 'description' && (
          <>
            <div className="question-footer">
              <Checkbox checked={question.required} onChange={(event) => onChange({ ...question, required: event.target.checked })}>
                必填
              </Checkbox>
              <button type="button" className="logic-toggle" onClick={() => setLogicOpen((prev) => !prev)}>
                显示条件
              </button>
            </div>

            {logicOpen && (
              <Space direction="vertical" className="logic-panel">
                <Select
                  className="logic-select"
                  allowClear
                  placeholder="触发题目"
                  value={question.visibleWhen?.questionId}
                  onChange={(value) =>
                    onChange({
                      ...question,
                      visibleWhen: value ? { questionId: value, valueIn: [] } : undefined,
                    })
                  }
                  options={optionQuestions.map((item) => ({ label: item.label || item.id, value: item.id }))}
                />
                {parent && (
                  <Select
                    className="logic-select"
                    mode="multiple"
                    placeholder="命中这些选项时显示"
                    value={question.visibleWhen?.valueIn}
                    onChange={(value) =>
                      onChange({
                        ...question,
                        visibleWhen: { questionId: parent.id, valueIn: value },
                      })
                    }
                    options={(parent.options || []).map((item) => ({ label: item, value: item }))}
                  />
                )}
              </Space>
            )}
          </>
        )}
      </Form>

      <Modal title="批量编辑选项" open={batchOpen} onCancel={() => setBatchOpen(false)} onOk={applyBatch} okText="应用" cancelText="取消">
        <Typography.Paragraph type="secondary">每行一个选项，保存后会替换当前选项列表。</Typography.Paragraph>
        <Input.TextArea rows={8} value={batchText} onChange={(event) => setBatchText(event.target.value)} placeholder={'选项1\n选项2\n选项3'} />
      </Modal>
    </div>
  );
}

function autoResizeTitle(element: HTMLTextAreaElement | null) {
  if (!element) return;
  element.style.height = 'auto';
  element.style.height = `${Math.max(32, element.scrollHeight)}px`;
}

function QuestionTitleTextArea({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    autoResizeTitle(titleRef.current);
  }, [value]);

  return (
    <textarea
      ref={titleRef}
      className="title-auto-resize"
      rows={1}
      value={value || ''}
      placeholder="请输入题目标题"
      onInput={(event) => autoResizeTitle(event.currentTarget)}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function SharePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<Survey>();

  useEffect(() => {
    http.get(`/admin/surveys/${id}`).then(({ data }) => setSurvey(data));
  }, [id]);

  if (!survey) return null;
  const url = `${location.origin}/s/${survey.shareToken}`;

  return (
    <Card title="分享与发布">
      <Space direction="vertical" size={16}>
        <QRCode value={url} />
        <Typography.Text copyable>{url}</Typography.Text>
        <Space>
          <Button
            type="primary"
            onClick={async () => {
              await http.post(`/admin/surveys/${id}/publish`);
              navigate('/surveys');
            }}
          >
            发布并分享
          </Button>
          <Button onClick={() => navigate('/surveys')}>返回</Button>
        </Space>
      </Space>
    </Card>
  );
}

function ResponsesPage() {
  const { id } = useParams();
  const { message } = AntApp.useApp();
  const [rows, setRows] = useState<any[]>([]);
  const [survey, setSurvey] = useState<Survey>();
  const [active, setActive] = useState<any>();
  const [form] = Form.useForm();

  const load = async () => {
    const [responsesRes, surveyRes] = await Promise.all([
      http.get(`/admin/surveys/${id}/responses`),
      http.get(`/admin/surveys/${id}`),
    ]);
    setRows(responsesRes.data);
    setSurvey(surveyRes.data);
  };

  useEffect(() => {
    load();
  }, [id]);

  function selectResponse(row: any) {
    setActive(row);
    form.resetFields();
  }

  const questions = (survey?.schemaJson?.questions || []).filter((question) => question.type !== 'description');

  return (
    <Card title="提交记录">
      <Table
        className="responses-table"
        rowKey="id"
        dataSource={rows}
        rowClassName={(row) => (active?.id === row.id ? 'response-row-active' : '')}
        onRow={(row) => ({
          onClick: () => selectResponse(row),
        })}
        columns={[
          { title: '提交人', render: (_: unknown, row: any) => row.wecomUser?.name || row.wecomUserid },
          { title: '提交时间', dataIndex: 'submittedAt', render: (value: string) => new Date(value).toLocaleString() },
          { title: '评分', render: (_: unknown, row: any) => row.comment?.score || '-' },
          {
            title: '操作',
            render: (_: unknown, row: any) => (
              <Button
                type="link"
                className="response-view-link"
                onClick={(event) => {
                  event.stopPropagation();
                  selectResponse(row);
                }}
              >
                查看/点评
              </Button>
            ),
          },
        ]}
      />

      <Drawer
        open={Boolean(active)}
        onClose={() => setActive(undefined)}
        width={340}
        closable={false}
        title={
          <div className="response-detail-title">
            <span>提交详情</span>
            <button type="button" className="response-detail-close" onClick={() => setActive(undefined)}>
              ×
            </button>
          </div>
        }
      >
        {active && (
          <div className="response-detail">
            <ResponseSubmitterInfo response={active} />
            <div className="qa-list">
              {questions.map((question, index) => (
                <ResponseAnswerItem key={question.id} question={question} index={index} value={active.answersJson?.[question.id]} />
              ))}
            </div>
            {active.comment ? (
              <Card size="small">
                评分：{active.comment.score}
                <br />
                点评：{active.comment.comment}
              </Card>
            ) : (
              <Form
                form={form}
                layout="vertical"
                onFinish={async (values) => {
                  await http.post(`/admin/responses/${active.id}/comment`, values);
                  message.success('已保存');
                  setActive(undefined);
                  load();
                }}
              >
                <Form.Item name="score" label="评分" rules={[{ required: true, message: '请输入评分' }]}>
                  <InputNumber className="response-comment-input" min={1} max={10} step={1} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="comment" label="点评">
                  <Input.TextArea className="response-comment-input" rows={4} />
                </Form.Item>
                <Button type="primary" htmlType="submit">
                  保存
                </Button>
              </Form>
            )}
          </div>
        )}
      </Drawer>
    </Card>
  );
}

function ResponseSubmitterInfo({ response }: { response: any }) {
  const name = response.wecomUser?.name || response.wecomUserid || '未知用户';
  const initial = String(name).trim().charAt(0) || '?';

  return (
    <div className="response-user">
      <div className="response-avatar">{initial}</div>
      <div className="response-user-meta">
        <div className="response-user-name">{name}</div>
        <div className="response-time">{new Date(response.submittedAt).toLocaleString()}</div>
      </div>
    </div>
  );
}

function ResponseAnswerItem({ question, index, value }: { question: Question; index: number; value: unknown }) {
  const formatted = formatAnswerValue(value);
  const empty = formatted === '';

  return (
    <div className="qa-item">
      <div className="qa-num">Q{index + 1}</div>
      <div className="qa-question">{question.label || question.id}</div>
      <div className={`qa-answer ${empty ? 'empty' : ''}`}>{empty ? '未作答' : formatted}</div>
    </div>
  );
}

function formatAnswerValue(value: unknown) {
  if (value === undefined || value === null || value === '') return '';
  if (Array.isArray(value)) return value.length ? value.map((item) => String(item)).join('、') : '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function ContactsPage() {
  const { message } = AntApp.useApp();
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>();
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File>();
  const [importFileList, setImportFileList] = useState<any[]>([]);
  const [form] = Form.useForm();
  const load = async () => setRows((await http.get('/admin/contacts')).data);

  useEffect(() => {
    load();
  }, []);

  function resetImportModal() {
    setImportFile(undefined);
    setImportFileList([]);
    setImporting(false);
  }

  function downloadContactTemplate() {
    const csv = [
      ['姓名', '部门', '工号', '职位', '手机号', '邮箱', '标签'],
      ['张三', '人事部/招聘组', 'HR001', '招聘专员', '13800000001', 'zhangsan@example.com', '总部,人事'],
      ['李四', '运营部/华东组', 'OP002', '运营主管', '13800000002', 'lisi@example.com', '一线,运营'],
    ]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '联系人导入模板.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function importContactsFromCsv() {
    if (!importFile) {
      message.error('请先选择 CSV 文件');
      return;
    }

    setImporting(true);
    Papa.parse(importFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        try {
          if (result.errors.length > 0) {
            message.error('CSV 解析失败，请检查模板格式');
            return;
          }
          const dataRows = (result.data as any[]).filter((row) => row && Object.values(row).some((value) => String(value || '').trim()));
          const invalidRows = dataRows.filter((row) => !String(row.name || row['姓名'] || '').trim() || !String(row.phone || row['手机号'] || '').trim());
          if (invalidRows.length > 0) {
            message.error(`导入失败：有 ${invalidRows.length} 行缺少姓名或手机号，请补全后重新上传`);
            return;
          }
          const { data } = await http.post('/admin/contacts/import', { rows: dataRows });
          message.success(`导入完成，共导入 ${data.count} 条${data.skipped ? `，跳过 ${data.skipped} 条` : ''}`);
          setImportOpen(false);
          resetImportModal();
          load();
        } catch (error: any) {
          message.error(error.response?.data?.message || '导入失败，请稍后重试');
        } finally {
          setImporting(false);
        }
      },
      error: () => {
        message.error('CSV 读取失败，请重新选择文件');
        setImporting(false);
      },
    });
  }

  return (
    <Card
      title="联系人"
      extra={
        <Space>
          <Button icon={<DownloadOutlined />} onClick={() => downloadFile('/admin/contacts/export', 'contacts.csv')}>
            导出
          </Button>
          <Button icon={<UploadOutlined />} onClick={() => setImportOpen(true)}>
            导入 CSV
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing({});
              form.resetFields();
            }}
          >
            新增
          </Button>
        </Space>
      }
    >
      <Table
        rowKey="id"
        dataSource={rows}
        columns={[
          { title: '姓名', dataIndex: 'name' },
          { title: '部门', dataIndex: 'department' },
          { title: '工号', dataIndex: 'jobNo' },
          { title: '手机号', dataIndex: 'phone' },
          { title: '邮箱', dataIndex: 'email' },
          {
            title: '操作',
            render: (_: unknown, row: any) => (
              <Space>
                <Button
                  onClick={() => {
                    setEditing(row);
                    form.setFieldsValue(row);
                  }}
                >
                  编辑
                </Button>
                <Popconfirm title="确认删除？" onConfirm={async () => { await http.delete(`/admin/contacts/${row.id}`); load(); }}>
                  <Button danger>删除</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal open={Boolean(editing)} title="联系人" onCancel={() => setEditing(undefined)} onOk={() => form.submit()} okText="保存" cancelText="取消">
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            if (editing.id) {
              await http.put(`/admin/contacts/${editing.id}`, values);
            } else {
              await http.post('/admin/contacts', values);
            }
            setEditing(undefined);
            load();
          }}
        >
          {['name', 'department', 'jobNo', 'position', 'phone', 'email', 'tags'].map((name) => (
            <Form.Item
              key={name}
              name={name}
              label={fieldLabel(name)}
              rules={
                name === 'name'
                  ? [{ required: true, message: '请输入姓名' }]
                  : name === 'phone'
                    ? [{ required: true, message: '请输入手机号，后续将用于匹配企微身份' }]
                    : []
              }
            >
              <Input />
            </Form.Item>
          ))}
        </Form>
      </Modal>

      <Modal
        title="批量导入联系人"
        open={importOpen}
        okText="确定上传"
        cancelText="取消"
        okButtonProps={{ disabled: !importFile, loading: importing }}
        onOk={importContactsFromCsv}
        onCancel={() => {
          setImportOpen(false);
          resetImportModal();
        }}
      >
        <Upload.Dragger
          accept=".csv,text/csv"
          maxCount={1}
          fileList={importFileList}
          beforeUpload={(file) => {
            const isCsv = file.name.toLowerCase().endsWith('.csv');
            if (!isCsv) {
              message.error('仅支持导入 CSV 文件，请下载模板后重新上传');
              setImportFile(undefined);
              setImportFileList([]);
              return Upload.LIST_IGNORE;
            }
            setImportFile(file as File);
            setImportFileList([file]);
            return false;
          }}
          onRemove={() => {
            setImportFile(undefined);
            setImportFileList([]);
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽 CSV 文件到此处上传</p>
          <p className="ant-upload-hint">最大支持 10000 条记录</p>
        </Upload.Dragger>
        <Typography.Paragraph className="contact-import-warning">*请按模板填写联系人信息，姓名和手机号为必填字段，手机号后续用于匹配企微身份，编码格式要求 UTF-8</Typography.Paragraph>
        <Button type="link" className="contact-template-link" onClick={downloadContactTemplate}>
          下载导入模板
        </Button>
      </Modal>
    </Card>
  );
}

function MembersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const load = async () => setRows((await http.get('/admin/members')).data);

  useEffect(() => {
    load();
  }, []);

  return (
    <Card title="后台成员" extra={<Button type="primary" onClick={() => setOpen(true)}>新增成员</Button>}>
      <Table
        rowKey="id"
        dataSource={rows}
        columns={[
          { title: '姓名', dataIndex: 'name' },
          { title: '手机号', dataIndex: 'phone' },
          { title: '主账号', dataIndex: 'isPrimary', render: (value: boolean) => (value ? <Tag color="gold">主账号</Tag> : '-') },
          { title: '创建时间', dataIndex: 'createdAt', render: (value: string) => new Date(value).toLocaleString() },
          {
            title: '操作',
            render: (_: unknown, row: any) =>
              row.isPrimary ? (
                <Button disabled>删除</Button>
              ) : (
                <Popconfirm title="确认删除？" onConfirm={async () => { await http.delete(`/admin/members/${row.id}`); load(); }}>
                  <Button danger>删除</Button>
                </Popconfirm>
              ),
          },
        ]}
      />

      <Modal open={open} title="新增成员" onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="保存" cancelText="取消">
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            await http.post('/admin/members', values);
            setOpen(false);
            form.resetFields();
            load();
          }}
        >
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="登录密码" rules={[{ required: true, message: '请输入登录密码' }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

function FillPage() {
  const { shareToken } = useParams();
  const navigate = useNavigate();
  const { message } = AntApp.useApp();
  const [survey, setSurvey] = useState<any>();
  const [error, setError] = useState<string>();
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    http
      .get(`/survey/${shareToken}`)
      .then(({ data }) => setSurvey(data))
      .catch((err) => setError(err.response?.data?.message || '问卷不存在或已下线'));
  }, [shareToken]);

  const visibleQuestions = useMemo(
    () => (survey?.schemaJson?.questions || []).filter((question: Question) => isVisible(question, answers)),
    [survey, answers],
  );

  if (error) return <Result status="warning" title={error} />;
  if (!survey) return <div className="fill-page"><Card loading /></div>;

  if (survey.type === 'promotional_document') {
    return (
      <div className="fill-page">
        <div className="fill-panel">
          <Typography.Title level={3}>{survey.title}</Typography.Title>
          <div className="rich-preview-body" dangerouslySetInnerHTML={{ __html: survey.schemaJson?.contentHtml || '' }} />
        </div>
      </div>
    );
  }

  if (survey.alreadySubmitted) return <Result status="info" title="您已提交过该问卷" />;

  async function submit() {
    if (submitting) return;

    setSubmitting(true);
    try {
      await http.post(`/survey/${shareToken}/submit`, { answers });
      navigate('/success');
    } catch (err: any) {
      message.error(err.response?.data?.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fill-page">
      <div className="fill-panel">
        <Typography.Title level={3}>{survey.title}</Typography.Title>
        <Typography.Paragraph type="secondary">当前模拟企微身份：{survey.currentUser?.name}</Typography.Paragraph>
        <Form layout="vertical" onFinish={submit}>
          {visibleQuestions.map((question: Question, index: number) => {
            const questionNo = String(index + 1).padStart(2, '0');
            if (question.type === 'description') {
              return (
                <div key={question.id} className="fill-question-block fill-description-block">
                  <div className="fill-question-heading">
                    <span className="fill-question-index">{questionNo}</span>
                    <span className="fill-question-title">{question.description || question.label}</span>
                  </div>
                </div>
              );
            }

            return (
              <div key={question.id} className="fill-question-block">
                <div className="fill-question-heading">
                  {question.required && <span className="fill-required-mark">*</span>}
                  <span className="fill-question-index">{questionNo}</span>
                  <span className="fill-question-title">{question.label}</span>
                </div>
                {question.description && <Typography.Paragraph className="fill-question-description">{question.description}</Typography.Paragraph>}
                <QuestionInput question={question} value={answers[question.id]} onChange={(value) => setAnswers((prev) => ({ ...prev, [question.id]: value }))} />
              </div>
            );
          })}
          <Button type="primary" htmlType="submit" block loading={submitting} disabled={submitting}>
            提交
          </Button>
        </Form>
      </div>
    </div>
  );
}

function QuestionInput({ question, value, onChange }: { question: Question; value: any; onChange: (value: any) => void }) {
  if (question.type === 'radio') {
    return (
      <div className="fill-choice-group">
        {(question.options || []).map((item) => (
          <button
            key={item}
            type="button"
            className={`fill-choice-row ${value === item ? 'selected' : ''}`}
            onClick={() => onChange(item)}
          >
            <span className="choice-symbol" />
            <span className="fill-choice-label">{item}</span>
          </button>
        ))}
      </div>
    );
  }
  if (question.type === 'checkbox') {
    const currentValues = Array.isArray(value) ? value : [];
    return (
      <div className="fill-choice-group">
        {(question.options || []).map((item) => {
          const checked = currentValues.includes(item);
          return (
            <button
              key={item}
              type="button"
              className={`fill-choice-row ${checked ? 'selected' : ''}`}
              onClick={() => onChange(checked ? currentValues.filter((entry) => entry !== item) : [...currentValues, item])}
            >
              <span className="choice-symbol checkbox-symbol" />
              <span className="fill-choice-label">{item}</span>
            </button>
          );
        })}
      </div>
    );
  }
  if (question.type === 'rating') {
    return (
      <div className="rating-input">
        <div className="rating-labels">
          <span>非常不满意</span>
          <span>非常满意</span>
        </div>
        <div className="rating-scale">
          {Array.from({ length: question.maxScore || 10 }, (_, score) => {
            const current = score + 1;
            return (
              <button key={current} type="button" className={`rating-score ${value === current ? 'selected' : ''}`} onClick={() => onChange(current)}>
                {current}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  if (question.type === 'text') {
    return <AutoResizeTextArea value={value} placeholder="请输入" onChange={onChange} />;
  }
  if (question.type === 'textarea') {
    return <AutoResizeTextArea value={value} placeholder="请输入" onChange={onChange} />;
  }
  if (question.type === 'date' || question.type === 'datetime') {
    return <input className="native-date" type={question.type === 'datetime' ? 'datetime-local' : 'date'} value={value || ''} onChange={(event) => onChange(event.target.value)} />;
  }
  if (question.type === 'file') {
    const props: UploadProps = {
      maxCount: 1,
      action: `${API}/uploads`,
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      onChange(info) {
        const url = info.file.response?.url;
        if (url) onChange(`${FILE_BASE}${url}`);
      },
    };
    return (
      <Upload {...props}>
        <Button icon={<UploadOutlined />}>上传文件</Button>
      </Upload>
    );
  }
  return <Input value={value} onChange={(event) => onChange(event.target.value)} />;
}

function autoResizeTextArea(element: HTMLTextAreaElement | null) {
  if (!element) return;
  element.style.height = 'auto';
  element.style.height = `${Math.max(44, element.scrollHeight)}px`;
}

function AutoResizeTextArea({ value, placeholder, onChange }: { value: any; placeholder: string; onChange: (value: string) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    autoResizeTextArea(textareaRef.current);
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      className="auto-resize"
      value={value || ''}
      placeholder={placeholder}
      onInput={(event) => autoResizeTextArea(event.currentTarget)}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function isVisible(question: Question, answers: Record<string, any>) {
  if (!question.visibleWhen) return true;
  const parent = answers[question.visibleWhen.questionId];
  if (Array.isArray(parent)) {
    return parent.some((item) => question.visibleWhen?.valueIn.includes(String(item)));
  }
  return question.visibleWhen.valueIn.includes(String(parent));
}

function surveyTypeLabel(type: SurveyKind) {
  return {
    assessment: '问卷考核',
    case_collection: '案例收集',
    promotional_document: '宣传文档类',
  }[type];
}

function surveyTypeColor(type: SurveyKind) {
  return {
    assessment: 'blue',
    case_collection: 'green',
    promotional_document: 'orange',
  }[type];
}

function typeLabel(type: QuestionType) {
  return {
    radio: '单选题',
    checkbox: '多选题',
    rating: '评分打分',
    description: '文本描述',
    text: '单行文本',
    textarea: '多行文本',
    file: '附件上传',
    date: '日期',
    datetime: '日期时间',
  }[type];
}

function fieldLabel(name: string) {
  return {
    name: '姓名',
    department: '部门',
    jobNo: '工号',
    position: '职位',
    phone: '手机号',
    email: '邮箱',
    tags: '标签',
  }[name] || name;
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
}

export default App;
