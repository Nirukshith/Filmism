import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useNavigate } from 'react-router-dom';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(24px) scale(0.97); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(17, 17, 17, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1.25rem;
  animation: ${fadeIn} 0.2s ease-out;
`;

const ModalBox = styled.div`
  background: #ffffff;
  border-radius: 20px;
  max-width: 540px;
  width: 100%;
  padding: 2.2rem;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  animation: ${slideUp} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
`;

const CloseBtn = styled.button`
  position: absolute;
  top: 1.2rem;
  right: 1.2rem;
  background: transparent;
  border: none;
  font-size: 1.25rem;
  color: #888;
  cursor: pointer;
  padding: 4px 8px;
  line-height: 1;
  border-radius: 6px;
  transition: all 0.2s;
  &:hover { color: #111; background: #f0f0f0; }
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const ModalTitle = styled.h2`
  font-family: 'kare', 'Playfair Display', Georgia, serif;
  font-size: 1.45rem;
  font-weight: 700;
  color: #111;
  margin: 0;
`;

const ModalSubtitle = styled.p`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.82rem;
  color: #666;
  margin: 0;
  line-height: 1.45;
`;

const OptionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`;

const OptionCard = styled.button`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.15rem 1.25rem;
  background: #fafafa;
  border: 1.5px solid #e5e5e5;
  border-radius: 14px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    background: #ffffff;
    border-color: #111111;
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
  }
`;

const OptionIconWrap = styled.div`
  font-size: 1.5rem;
  line-height: 1;
  padding-top: 2px;
`;

const OptionContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const OptionHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`;

const OptionTitle = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: #111;
`;

const Badge = styled.span`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: ${({ $type }) =>
    $type === 'keep' ? 'rgba(46, 125, 50, 0.12)' :
    $type === 'warning' ? 'rgba(255, 117, 31, 0.12)' :
    'rgba(224, 83, 83, 0.12)'};
  color: ${({ $type }) =>
    $type === 'keep' ? '#2e7d32' :
    $type === 'warning' ? '#e65100' :
    '#c62828'};
  border: 1px solid ${({ $type }) =>
    $type === 'keep' ? 'rgba(46, 125, 50, 0.25)' :
    $type === 'warning' ? 'rgba(255, 117, 31, 0.25)' :
    'rgba(224, 83, 83, 0.25)'};
`;

const OptionDesc = styled.div`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.76rem;
  color: #666;
  line-height: 1.4;
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  padding-top: 0.4rem;
`;

const CancelBtn = styled.button`
  font-family: 'Lexend Deca', sans-serif;
  font-size: 0.8rem;
  color: #888;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  &:hover { color: #111; }
`;

function RecalibrateModal({ isOpen, onClose }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSelect = (mode) => {
    onClose();
    navigate(`/taste?recalibrate=${mode}`);
  };

  return (
    <Overlay onClick={onClose}>
      <ModalBox onClick={(e) => e.stopPropagation()}>
        <CloseBtn onClick={onClose} aria-label="Close">✕</CloseBtn>
        <Header>
          <ModalTitle>Recalibrate Taste Profile</ModalTitle>
          <ModalSubtitle>
            Select which cinematic dimension you would like to adjust. Downstream selections will be updated accordingly:
          </ModalSubtitle>
        </Header>

        <OptionsList>
          {/* Option 1: Origins */}
          <OptionCard onClick={() => handleSelect('origins')}>
            <OptionIconWrap>🌍</OptionIconWrap>
            <OptionContent>
              <OptionHeaderRow>
                <OptionTitle>Recalibrate Origins</OptionTitle>
                <Badge $type="warning">Resets Selected Films</Badge>
              </OptionHeaderRow>
              <OptionDesc>
                Select new regional cinema traditions. Your genres are preserved, while previous film selections will be reset.
              </OptionDesc>
            </OptionContent>
          </OptionCard>

          {/* Option 2: Genres */}
          <OptionCard onClick={() => handleSelect('genres')}>
            <OptionIconWrap>🎭</OptionIconWrap>
            <OptionContent>
              <OptionHeaderRow>
                <OptionTitle>Recalibrate Genres</OptionTitle>
                <Badge $type="reset">Resets Origins & Films</Badge>
              </OptionHeaderRow>
              <OptionDesc>
                Change your core genre interests. Both your previously selected cinema origins and film selections will be reset.
              </OptionDesc>
            </OptionContent>
          </OptionCard>
        </OptionsList>

        <Footer>
          <CancelBtn onClick={onClose}>Keep current profile</CancelBtn>
        </Footer>
      </ModalBox>
    </Overlay>
  );
}

export default RecalibrateModal;
