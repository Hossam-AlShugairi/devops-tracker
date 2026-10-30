export interface SeedCourse {
  name: string;
  color: string;
  phase: number;
  topics: Array<{
    title: string;
    dueDate: string;
  }>;
}

export const SEED_COURSES: SeedCourse[] = [
  {
    name: "NSE4 · FortiGate",
    color: "#e5484d",
    phase: 1,
    topics: [
      { title: "تجهيز FortiGate VM + الـ GUI والـ CLI + Interfaces", dueDate: "2026-11-12" },
      { title: "Firewall Policies بعمق", dueDate: "2026-11-19" },
      { title: "NAT (SNAT / DNAT / VIP)", dueDate: "2026-11-19" },
      { title: "Static و Policy routing", dueDate: "2026-11-19" },
      { title: "Security Profiles (Web Filter, App Control, AV, IPS)", dueDate: "2026-11-26" },
      { title: "SSL Inspection و Authentication", dueDate: "2026-11-26" },
      { title: "IPsec و SSL VPN", dueDate: "2026-12-03" },
      { title: "SD-WAN و HA", dueDate: "2026-12-03" },
      { title: "Logging والـ Monitoring", dueDate: "2026-12-03" },
      { title: "Practice exams + امتحان NSE4", dueDate: "2026-12-05" }
    ]
  },
  {
    name: "Git & GitHub",
    color: "#f97316",
    phase: 1,
    topics: [
      { title: "init / add / commit / history", dueDate: "2026-11-09" },
      { title: "Branches و merge وحل الـ conflicts", dueDate: "2026-11-10" },
      { title: "Remote: push / pull و Pull Requests", dueDate: "2026-11-11" },
      { title: "SSH keys و .gitignore", dueDate: "2026-11-12" },
      { title: "إنشاء repo الـ portfolio ورفع أول ملاحظات", dueDate: "2026-11-12" }
    ]
  },
  {
    name: "Docker",
    color: "#0ea5e9",
    phase: 1,
    topics: [
      { title: "Image vs Container وأوامر run/ps/logs/exec", dueDate: "2026-11-19" },
      { title: "Ports و Volumes", dueDate: "2026-11-19" },
      { title: "كتابة أول Dockerfile", dueDate: "2026-11-19" },
      { title: "Multi-stage builds", dueDate: "2026-11-26" },
      { title: "Docker Networks", dueDate: "2026-11-26" },
      { title: "Docker Compose (أكتر من service)", dueDate: "2026-11-26" },
      { title: "مشروع: containerize تطبيق حقيقي", dueDate: "2026-12-03" },
      { title: "رفع الـ image على Docker Hub", dueDate: "2026-12-03" },
      { title: "توثيق المشروع في README على GitHub", dueDate: "2026-12-03" }
    ]
  },
  {
    name: "RHCSA",
    color: "#dc2626",
    phase: 1,
    topics: [
      { title: "الـ shell والملفات والصلاحيات", dueDate: "2026-12-13" },
      { title: "Users و Groups و sudo", dueDate: "2026-12-20" },
      { title: "Storage: partitions و LVM", dueDate: "2026-12-27" },
      { title: "File systems و fstab و NFS/autofs", dueDate: "2027-01-03" },
      { title: "Networking و firewalld", dueDate: "2027-01-10" },
      { title: "SELinux", dueDate: "2027-01-17" },
      { title: "Systemd و Scheduling و Boot targets", dueDate: "2027-01-24" },
      { title: "Package management و Podman", dueDate: "2027-01-28" },
      { title: "Practice exams + امتحان RHCSA", dueDate: "2027-01-31" }
    ]
  },
  {
    name: "GitHub Actions (CI/CD)",
    color: "#8b5cf6",
    phase: 1,
    topics: [
      { title: "Workflows الأساسية (build / test)", dueDate: "2026-12-20" },
      { title: "Build و push لـ Docker image تلقائي", dueDate: "2027-01-10" },
      { title: "Secrets و Environments و Deploy", dueDate: "2027-01-31" }
    ]
  },
  {
    name: "AWS Solutions Architect",
    color: "#f59e0b",
    phase: 1,
    topics: [
      { title: "IAM والأمان", dueDate: "2027-02-07" },
      { title: "EC2 و EBS", dueDate: "2027-02-14" },
      { title: "S3 والـ Storage", dueDate: "2027-02-21" },
      { title: "VPC والـ Networking", dueDate: "2027-02-28" },
      { title: "RDS و DynamoDB", dueDate: "2027-03-07" },
      { title: "ELB و Auto Scaling و Route 53", dueDate: "2027-03-14" },
      { title: "Serverless: Lambda, SQS, SNS", dueDate: "2027-03-21" },
      { title: "Well-Architected + Practice exams + امتحان SAA", dueDate: "2027-03-31" }
    ]
  },
  {
    name: "Terraform",
    color: "#10b981",
    phase: 1,
    topics: [
      { title: "أساسيات Terraform (providers, resources)", dueDate: "2027-02-21" },
      { title: "Variables و State و Modules", dueDate: "2027-03-07" },
      { title: "بناء VPC + EC2 على AWS بالـ Terraform", dueDate: "2027-03-21" },
      { title: "Remote backend + مشروع IaC موثق", dueDate: "2027-03-31" }
    ]
  },
  {
    name: "المشروع النهائي والتقديم",
    color: "#ec4899",
    phase: 1,
    topics: [
      { title: "مشروع يجمع CI/CD + IaC + Docker", dueDate: "2027-04-15" },
      { title: "Monitoring بـ Prometheus و Grafana", dueDate: "2027-04-22" },
      { title: "تجهيز الـ CV و LinkedIn", dueDate: "2027-04-25" },
      { title: "بداية التقديم على الوظايف", dueDate: "2027-04-30" }
    ]
  },
  // Phase 2 Courses (Hidden by default until enabled)
  {
    name: "CKA (Kubernetes Certified Administrator)",
    color: "#326ce5",
    phase: 2,
    topics: [
      { title: "Architecture, Installation & Configuration", dueDate: "2027-05-15" },
      { title: "Workloads & Scheduling (Pods, Deployments, DaemonSets)", dueDate: "2027-05-25" },
      { title: "Services & Networking (CoreDNS, Ingress, CNI)", dueDate: "2027-06-05" },
      { title: "Storage (PV, PVC, StorageClasses)", dueDate: "2027-06-15" },
      { title: "Cluster Maintenance & Troubleshooting (etcd backup/restore)", dueDate: "2027-06-25" },
      { title: "Practice Killer.sh + امتحان CKA", dueDate: "2027-06-30" }
    ]
  },
  {
    name: "CompTIA Security+",
    color: "#ef4444",
    phase: 2,
    topics: [
      { title: "General Security Concepts & Threats / Vulnerabilities", dueDate: "2027-07-15" },
      { title: "Security Architecture & Cryptography", dueDate: "2027-07-30" },
      { title: "Security Operations & Incident Response", dueDate: "2027-08-15" },
      { title: "Security Program Management & Compliance", dueDate: "2027-08-25" },
      { title: "Mock Exams + امتحان Security+", dueDate: "2027-08-31" }
    ]
  }
];
