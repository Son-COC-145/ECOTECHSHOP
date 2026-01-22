// src/components/home/Team.jsx
import React from "react";
import "../../styles/team.css";

function Team() {
  const teamMembers = [
    {
      name: "Thân Xuân Hạnh",
      role: "Chuyên gia tư vấn công nghệ",
      bio: "Chuyên tư vấn và hỗ trợ khách hàng lựa chọn các giải pháp công nghệ phù hợp với nhu cầu và ngân sách. Luôn cập nhật xu hướng công nghệ mới nhất.",
      image: "https://ui-avatars.com/api/?name=Than+Xuan+Hanh&size=200&background=fecaca&color=dc2626&bold=true&font-size=0.5",
    },
    {
      name: "Nguyễn Hữu Thắng",
      role: "Kỹ sư hệ thống & mạng",
      bio: "Chuyên gia về hệ thống mạng, bảo mật và tối ưu hóa hiệu suất. Hỗ trợ khách hàng trong việc thiết lập và vận hành hệ thống công nghệ một cách hiệu quả.",
      image: "https://ui-avatars.com/api/?name=Nguyen+Huu+Thang&size=200&background=fecaca&color=dc2626&bold=true&font-size=0.5",
    },
    {
      name: "Lê Thu Hà",
      role: "Chuyên viên chăm sóc khách hàng",
      bio: "Theo sát đơn hàng, hỗ trợ bảo hành – đổi trả, giải đáp mọi thắc mắc về sản phẩm và dịch vụ sau bán hàng của EcoTechStore.",
      image: "https://ui-avatars.com/api/?name=Le+Thu+Ha&size=200&background=fecaca&color=dc2626&bold=true&font-size=0.5",
    },
  ];

  return (
    <section className="team" id="team">
      <div className="team-container">
        <div className="team-header">
          <p className="team-eyebrow">Đội ngũ của chúng tôi</p>
          <h2 className="team-title">Chuyên gia công nghệ đồng hành cùng bạn</h2>
          <p className="team-subtitle">
            Từ tư vấn chọn máy, tối ưu cấu hình cho đến hỗ trợ sau bán hàng – đội
            ngũ EcoTechStore luôn sẵn sàng hỗ trợ bạn ở mọi bước.
          </p>
        </div>

        <div className="team-grid">
          {teamMembers.map((member, index) => (
            <article className="team-card" key={index}>
              <div className="team-avatar">
                <img src={member.image} alt={member.name} loading="lazy" />
              </div>
              <h3 className="team-name">{member.name}</h3>
              <p className="team-role">{member.role}</p>
              <p className="team-bio">{member.bio}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Team;